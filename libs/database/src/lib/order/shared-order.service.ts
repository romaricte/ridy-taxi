import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonCouponService } from '../coupon/common-coupon.service';
import { CouponEntity } from '../entities/coupon.entity';
import { DriverDeductTransactionType } from '../entities/enums/driver-deduct-transaction-type.enum';
import { DriverRechargeTransactionType } from '../entities/enums/driver-recharge-transaction-type.enum';
import { PaymentStatus } from '../entities/enums/payment-status.enum';
import { ProviderRechargeTransactionType } from '../entities/enums/provider-recharge-transaction-type.enum';
import { RequestActivityType } from '../entities/enums/request-activity-type.enum';
import { RiderDeductTransactionType } from '../entities/enums/rider-deduct-transaction-type.enum';
import { ServiceOptionType } from '../entities/enums/service-option-type.enum';
import { TransactionAction } from '../entities/enums/transaction-action.enum';
import { TransactionStatus } from '../entities/enums/transaction-status.enum';
import { PaymentEntity } from '../entities/payment.entity';
import { RequestActivityEntity } from '../entities/taxi/request-activity.entity';
import { ServiceOptionEntity } from '../entities/taxi/service-option.entity';
import { ZonePriceEntity } from '../entities/taxi/zone-price.entity';
import { In, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bullmq';
import { OrderStatus } from '../entities/enums/order-status.enum';
import { TaxiOrderEntity } from '../entities/taxi/taxi-order.entity';
import { ServiceCategoryEntity } from '../entities/taxi/service-category.entity';
import { Point } from '../interfaces/point';
import { DriverRedisService } from '../redis/driver-redis.service';
import { RideOfferRedisService } from '../redis/ride-offer-redis.service';
import { DriverNotificationService } from './firebase-notification-service/driver-notification.service';
import { RiderNotificationService } from './firebase-notification-service/rider-notification.service';
import { GoogleServicesService } from './google-services/google-services.service';
import { RegionService } from './region/region.service';
import { ServiceService } from './service.service';
import { SharedDriverService } from './shared-driver.service';
import { SharedFleetService } from './shared-fleet.service';
import { SharedProviderService } from './shared-provider.service';
import { SharedRiderService } from './shared-rider.service';
import { firstValueFrom } from 'rxjs';
import { ForbiddenError } from '@nestjs/apollo';
import { PaymentMode } from '../entities/enums/payment-mode.enum';
import { SharedCustomerWalletService } from '../customer-wallet/shared-customer-wallet.service';
import { TaxiOrderType } from '../entities/taxi/enums/taxi-order-type.enum';
import { Queue } from 'bullmq';
import {
  ActiveOrderCommonRedisService,
  ActiveOrderRedisSnapshot,
  DriverEventType,
  PubSubService,
  RiderOrderUpdateType,
  RiderRedisService,
} from '../redis';
import { DeliveryContact, OrderMessageEntity } from '../entities';
import { WaypointBase } from '../interfaces';

@Injectable()
export class SharedOrderService {
  constructor(
    @InjectRepository(TaxiOrderEntity)
    private orderRepository: Repository<TaxiOrderEntity>,
    @InjectRepository(RequestActivityEntity)
    private activityRepository: Repository<RequestActivityEntity>,
    private regionService: RegionService,
    @InjectRepository(ServiceCategoryEntity)
    private serviceCategoryRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(ServiceOptionEntity)
    private serviceOptionRepository: Repository<ServiceOptionEntity>,
    @InjectRepository(ZonePriceEntity)
    private zonePriceRepository: Repository<ZonePriceEntity>,
    @InjectRepository(PaymentEntity)
    private paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(OrderMessageEntity)
    private messageRepository: Repository<OrderMessageEntity>,
    private googleServices: GoogleServicesService,
    private servicesService: ServiceService,
    private riderService: SharedRiderService,
    private sharedRiderWalletService: SharedCustomerWalletService,
    private driverRedisService: DriverRedisService,
    private riderRedisService: RiderRedisService,
    private rideOfferRedisService: RideOfferRedisService,
    private activeOrderRedisService: ActiveOrderCommonRedisService,
    private driverService: SharedDriverService,
    private sharedProviderService: SharedProviderService,
    private sharedFleetService: SharedFleetService,
    private commonCouponService: CommonCouponService,
    private driverNotificationService: DriverNotificationService,
    private riderNotificationService: RiderNotificationService,
    private httpService: HttpService,
    @InjectQueue('dispatch-main')
    private readonly dispatchMainQueue: Queue,
    private pubsubService: PubSubService,
  ) {}

  async saveActiveOrderToDisk(
    order: ActiveOrderRedisSnapshot,
    entityUpdates?: Partial<TaxiOrderEntity>,
  ): Promise<boolean> {
    const orderEntity: Partial<TaxiOrderEntity> = {
      id: parseInt(order.id),
      driverId: parseInt(order.driverId),
      status: order.status,
      waitMinutes: order.waitMinutes,
      expectedTimestamp: order.scheduledAt,
      pickupEta: order.pickupEta,
      dropOffEta: order.dropoffEta,
      paymentMode: order.paymentMethod.mode,
      finishTimestamp: new Date(),
      ...entityUpdates,
    };
    await this.orderRepository.save(orderEntity);
    for (const message of order.chatMessages) {
      await this.messageRepository.save({
        requestId: parseInt(order.id),
        content: message.content,
        createdAt: message.createdAt,
        sentByDriver: message.isFromDriver,
      });
    }
    return true;
  }

  async getZonePricingsForPoints(
    from: Point,
    to: Point,
  ): Promise<ZonePriceEntity[]> {
    let pricings: ZonePriceEntity[] = await this.zonePriceRepository.query(
      "SELECT * FROM zone_price WHERE ST_Within(st_geomfromtext('POINT(? ?)'), `from`) AND ST_Within(st_geomfromtext('POINT(? ?)'), `to`)",
      [from.lng, from.lat, to.lng, to.lat],
    );
    pricings = await this.zonePriceRepository.find({
      where: { id: In(pricings.map((p) => p.id)) },
      relations: { services: true, fleets: true },
    });
    return pricings;
  }

  async calculateFare(input: {
    points: Point[];
    twoWay?: boolean;
    coupon?: CouponEntity;
    riderId: number;
    waitTime?: number;
    selectedOptionIds?: string[];
    orderType: TaxiOrderType;
  }) {
    Logger.log(input, 'SharedOrderService.calculateFare.input');
    // calculate the radial distance between all points
    const distances = input.points.map((point, index) => {
      if (index === 0) return 0;
      return this.getDistanceBetweenPoints(point, input.points[index - 1]);
    });
    const totalDistance = distances.reduce((a, b) => a + b, 0);
    if (totalDistance > 100_000) {
      throw new ForbiddenError(
        'Total distance exceeds 100 km. Please reduce the distance or split the trip.',
      );
    }
    if (totalDistance < 1_000) {
      throw new ForbiddenError(
        'Total distance is less than 1 km. Try a longer trip.',
      );
    }
    let zonePricings: ZonePriceEntity[] = [];
    if (input.points.length == 2) {
      zonePricings = await this.getZonePricingsForPoints(
        input.points[0],
        input.points[1],
      );
    }
    const regions = await this.regionService.getRegionWithPoint(
      input.points[0],
    );
    if (regions.length < 1) {
      throw new ForbiddenError(CalculateFareError.RegionUnsupported);
    }
    const servicesInRegion = await this.regionService.getRegionServices(
      regions[0].id,
    );
    if (servicesInRegion.length < 1) {
      throw new ForbiddenError(CalculateFareError.NoServiceInRegion);
    }
    if ((input.twoWay ?? false) && input.points.length > 1) {
      input.points.push(input.points[0]);
    }
    const metrics =
      servicesInRegion.findIndex((x) => x.perHundredMeters > 0) > -1
        ? await this.googleServices.getSumDistanceAndDuration(input.points)
        : { distance: 0, duration: 0, directions: [] };
    const cats = await this.serviceCategoryRepository.find({
      relations: {
        services: {
          media: true,
          options: true,
        },
      },
    });
    const feeMultiplier =
      await this.sharedFleetService.getFleetMultiplierInPoint(input.points[0]);
    const _cats = cats
      .map((cat) => {
        const { services, ..._cat } = cat;

        const _services = services
          .filter(
            (x) => servicesInRegion.filter((y) => y.id == x.id).length > 0,
          )
          .filter((x) => x.orderTypes.includes(input.orderType))
          .map((service) => {
            let cost = 0;
            const zonePricesWithService = zonePricings.filter((zone) =>
              zone.services.find((_service) => _service.id == service.id),
            );
            if (zonePricesWithService.length > 0) {
              cost = zonePricesWithService[0].cost;
              const eta = new Date();
              for (const _multiplier of zonePricesWithService[0]
                .timeMultipliers) {
                const startMinutes =
                  parseInt(_multiplier.startTime.split(':')[0]) * 60 +
                  parseInt(_multiplier.startTime.split(':')[1]);
                const nowMinutes = eta.getHours() * 60 + eta.getMinutes();
                const endMinutes =
                  parseInt(_multiplier.endTime.split(':')[0]) * 60 +
                  parseInt(_multiplier.endTime.split(':')[1]);
                if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
                  cost *= _multiplier.multiply;
                }
              }
            } else {
              cost = this.servicesService.calculateCost(
                service,
                metrics.distance,
                metrics.duration,
                new Date(),
                feeMultiplier,
              );
            }
            const waitFee = service.perMinuteWait * (input.waitTime ?? 0);
            if (input.coupon == null) {
              return {
                ...service,
                cost: cost + waitFee,
              };
            } else {
              const costAfterCoupon =
                this.commonCouponService.applyCouponOnPrice(
                  input.coupon,
                  cost + waitFee,
                );
              return {
                ...service,
                cost: cost + waitFee,
                costAfterCoupon,
              };
            }
          });
        return {
          ..._cat,
          services: _services.sort((a, b) => {
            if (a.displayPriority > b.displayPriority) return -1;
            if (a.displayPriority < b.displayPriority) return 1;
            return 0;
          }),
        };
      })
      .filter((x) => x.services.length > 0);
    if (_cats.length == 0) {
      throw new ForbiddenError(CalculateFareError.NoServiceInRegion);
    }

    return {
      ...metrics,
      currency: regions[0].currency,
      services: _cats,
    };
  }
  getDistanceBetweenPoints(point: Point, arg1: Point): number {
    const R = 6371e3; // metres
    const φ1 = (point.lat * Math.PI) / 180;
    const φ2 = (arg1.lat * Math.PI) / 180;
    const Δφ = ((arg1.lat - point.lat) * Math.PI) / 180;
    const Δλ = ((arg1.lng - point.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  }

  async createOrder(input: {
    type: TaxiOrderType;
    waypoints: {
      address: string;
      point: Point;
      deliveryContact?: DeliveryContact;
    }[];
    riderId: number;
    serviceId: number;
    intervalMinutes: number;
    operatorId?: number;
    twoWay?: boolean;
    optionIds?: string[];
    couponCode?: string;
    fleetId?: number;
    paymentMode?: PaymentMode;
    paymentMethodId?: number;
    waitMinutes: number;
    driverId?: number;
  }): Promise<TaxiOrderEntity> {
    Logger.log(input, 'SharedOrderService.createOrder.input');
    let zonePricings: ZonePriceEntity[] = [];
    if (input.waypoints.length == 2) {
      zonePricings = await this.getZonePricingsForPoints(
        input.waypoints[0].point,
        input.waypoints[1].point,
      );
    }
    const service = await this.servicesService.getWithId(input.serviceId);
    if (service == undefined) {
      throw new ForbiddenError('SERVICE_NOT_FOUND');
    }
    const fleetIdsInPoint = await this.sharedFleetService.getFleetIdsInPoint(
      input.waypoints[0].point,
    );
    let optionFee = 0;
    let options: ServiceOptionEntity[] = [];
    if (input.optionIds != null) {
      options = await this.serviceOptionRepository.findBy({
        id: In(input.optionIds),
      });
      if ((input.twoWay ?? false) && input.waypoints.length > 1) {
        input.waypoints.push(input.waypoints[0]);
      }
      const paidOptions = options.filter(
        (option) => option.type == ServiceOptionType.Paid,
      );
      optionFee =
        paidOptions.length == 0
          ? 0
          : paidOptions
              .map((option) => option.additionalFee ?? 0)
              .reduce(
                (previous: number, current: number) => (current += previous),
              );
    }
    const metrics = await this.googleServices.getSumDistanceAndDuration(
      input.waypoints.map((w) => w.point),
    );
    const expectedTimestamp = new Date(
      new Date().getTime() + (input.intervalMinutes | 0) * 60 * 1000,
    );
    const rider = await this.riderService.repo.findOneOrFail({
      where: { id: input.riderId },
      relations: { media: true, sessions: true },
    });
    const feeMultiplier =
      fleetIdsInPoint.length == 0
        ? 1
        : ((await this.sharedFleetService.getFleetById(fleetIdsInPoint[0]))
            ?.feeMultiplier ?? 1);
    let cost =
      this.servicesService.calculateCost(
        service,
        metrics.distance,
        metrics.duration,
        expectedTimestamp,
        feeMultiplier,
      ) +
      optionFee +
      service.perMinuteWait * (input.waitMinutes ?? 0);
    const zonePricing = zonePricings.filter((price) => {
      return (
        price.services.filter((service) => service.id == input.serviceId)
          .length > 0
      );
    });
    Logger.log(zonePricing, 'SharedOrderService.createOrder.zonePricing');
    if (zonePricing.length > 0) {
      cost = zonePricing[0].cost;
      const eta = new Date();
      for (const _multiplier of zonePricings[0].timeMultipliers) {
        const startMinutes =
          parseInt(_multiplier.startTime.split(':')[0]) * 60 +
          parseInt(_multiplier.startTime.split(':')[1]);
        const nowMinutes = eta.getHours() * 60 + eta.getMinutes();
        const endMinutes =
          parseInt(_multiplier.endTime.split(':')[0]) * 60 +
          parseInt(_multiplier.endTime.split(':')[1]);
        if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
          cost *= _multiplier.multiply;
        }
      }
    }

    const regions = await this.regionService.getRegionWithPoint(
      input.waypoints[0].point,
    );
    Logger.log(regions, 'SharedOrderService.createOrder.regions');

    if (
      service.maximumDestinationDistance != 0 &&
      metrics.distance > service.maximumDestinationDistance
    ) {
      throw new ForbiddenError('DISTANCE_TOO_FAR');
    }
    let shouldPrePay = false;
    const paidAmount = 0;

    if (service.prepayPercent > 0) {
      const balance =
        await this.sharedRiderWalletService.getRiderCreditInCurrency(
          input.riderId,
          regions[0].currency,
        );
      const amountNeedsToBePrePaid = (cost * service.prepayPercent) / 100;
      switch (input.paymentMode) {
        case PaymentMode.Cash:
          break;
        case PaymentMode.Wallet:
          if (balance < amountNeedsToBePrePaid) {
            shouldPrePay = true;
          }
          break;
        case PaymentMode.PaymentGateway:
          shouldPrePay = true;
          break;
        case PaymentMode.SavedPaymentMethod:
          shouldPrePay = true;
          break;
      }
    }
    const orderObject: TaxiOrderEntity = this.orderRepository.create({
      serviceId: input.serviceId,
      type: input.type,
      contacts: input.waypoints
        .map((w) => w.deliveryContact ?? null)
        .filter((c) => c !== null),
      currency: regions[0].currency,
      riderId: input.riderId,
      points: input.waypoints.map((w) => w.point),
      addresses: input.waypoints.map((w) => w.address.replace(', ', '-')),
      distanceBest: metrics.distance,
      durationBest: metrics.duration,
      directions: metrics.directions,
      paymentMode: input.paymentMode,
      driverId: input.driverId,
      savedPaymentMethodId:
        input.paymentMode == PaymentMode.SavedPaymentMethod
          ? input.paymentMethodId!
          : undefined,
      paymentGatewayId:
        input.paymentMode == PaymentMode.PaymentGateway
          ? input.paymentMethodId!
          : undefined,
      status: shouldPrePay
        ? OrderStatus.WaitingForPrePay
        : input.intervalMinutes > 10
          ? OrderStatus.Booked
          : OrderStatus.Requested,
      paidAmount: paidAmount,
      costBest: cost,
      costAfterCoupon: cost,
      expectedTimestamp: expectedTimestamp,
      operatorId: input.operatorId,
      waitMinutes: input.waitMinutes ?? 0,
      waitCost: service.perMinuteWait * (input.waitMinutes ?? 0),
      rideOptionsCost: optionFee,
      fleetId: input.fleetId,
      providerShare:
        service.providerShareFlat + (service.providerSharePercent * cost) / 100,
      options: options,
    });
    let order = await this.orderRepository.save(orderObject);
    order = await this.orderRepository.findOneOrFail({
      where: { id: order.id },
      relations: {
        rider: {
          wallets: true,
        },
        paymentGateway: true,
        savedPaymentMethod: true,
        service: {
          media: true,
        },
        options: true,
      },
    });
    if (input.couponCode != null && input.couponCode != '' && rider != null) {
      order = await this.commonCouponService.applyCoupon(
        input.couponCode,
        order.id,
        rider.id,
      );
    }
    let activityType = RequestActivityType.RequestedByRider;
    if (input.intervalMinutes > 0) {
      activityType =
        input.operatorId == null
          ? (activityType = RequestActivityType.BookedByRider)
          : RequestActivityType.BookedByOperator;
    } else {
      activityType =
        input.operatorId == null
          ? (activityType = RequestActivityType.RequestedByRider)
          : RequestActivityType.RequestedByOperator;
    }
    this.activityRepository.insert({ requestId: order.id, type: activityType });
    this.riderService.repo.update(order.riderId!, {
      lastActivityAt: new Date(),
    });

    if (!shouldPrePay) {
      await this.dispatchRide(order);
    }
    return order;
  }

  private async dispatchRide(order: TaxiOrderEntity) {
    const now = Date.now();
    const intervalMinutes = Math.floor(
      (order.expectedTimestamp!.getTime() - now) / (60 * 1000),
    );
    Logger.log(
      `Dispatching ride in ${intervalMinutes} minutes`,
      'SharedOrderService.dispatchRide',
    );
    await this.rideOfferRedisService.createRideOffer({
      status: order.status,
      currency: order.currency,
      type: order.type,
      estimatedDistance: order.distanceBest,
      estimatedDuration: order.durationBest,
      orderId: order.id.toString(),
      riderId: order.riderId!.toString(),
      serviceId: order.serviceId.toString(),
      waitMinutes: order.waitMinutes,
      driverId: order.driverId?.toString(),
      scheduledAt: order.expectedTimestamp!,
      pickupLocation: order.points[0],
      fleetId: order.fleetId,
      costEstimateForRider: order.costAfterCoupon,
      costEstimateForDriver: order.costBest - order.providerShare,
      paymentMethod: order.paymentMethod(),
      totalPaid: order.paidAmount,
      serviceName: order.service!.name,
      riderFirstName: order.rider.firstName,
      riderLastName: order.rider.lastName,
      riderProfileImageUrl: order.rider.media?.address,
      riderCountryIso: order.rider.countryIso,
      riderEmail: order.rider.email,
      riderGender: order.rider.gender,
      riderMobileNumber: order.rider.mobileNumber,
      riderWalletCredit:
        order.rider.wallets?.filter(
          (wallet) => wallet.currency === order.currency,
        )[0]?.balance ?? 0,
      riderFcmTokens:
        order.rider.notificationPlayerId != null
          ? [order.rider.notificationPlayerId]
          : [],
      serviceImageAddress: order.service!.media.address,
      options: order.options ?? [],
      waypoints: order.waypoints(),
      createdAt: order.createdOn,
      tripDirections: order.directions,
    });
    if (order.driverId != null) {
      this.assignOrderToDriver(order.id, order.driverId);
    }
    this.dispatchMainQueue.add(
      'dispatch',
      {
        orderId: order.id,
      },
      {
        jobId: `dispatch:${order.id}`,
        delay: intervalMinutes * 60 * 1000,
      },
    );
  }

  async processPrePay(orderId: number, authorizedAmount = 0) {
    let order: TaxiOrderEntity = await this.orderRepository.findOneOrFail({
      where: { id: orderId },
      relations: {
        service: true,
        driver: {
          fleet: true,
        },
        rider: true,
      },
    });
    const riderCredit =
      await this.sharedRiderWalletService.getRiderCreditInCurrency(
        order.riderId,
        order.currency,
      );
    const minimumRequired =
      order.costAfterCoupon * (order.service!.prepayPercent / 100.0);
    Logger.log(`riderCredit: ${riderCredit}`, 'processPrePay');
    Logger.log(`authorizedAmount: ${authorizedAmount}`, 'processPrePay');
    Logger.log(`serviceFee: ${order.costAfterCoupon}`, 'processPrePay');
    Logger.log(
      `Minmum required authorizedAmount: ${minimumRequired}`,
      'processPrePay',
    );
    if (riderCredit + authorizedAmount - minimumRequired < 0) {
      throw new ForbiddenError('Credit is not enough');
    }
    await this.orderRepository.update(order.id, {
      status: OrderStatus.Requested,
    });
    order = await this.orderRepository.findOneOrFail({
      where: { id: orderId },
      relations: {
        service: true,
        driver: {
          fleet: true,
        },
        rider: {
          wallets: true,
        },
      },
    });
    await this.dispatchRide(order);
  }

  async finish(
    orderId: number,
    cashAmount = 0,
    deduceFromWallet = true,
  ): Promise<ActiveOrderRedisSnapshot | null> {
    // 1) Load + validate
    const order = await this.activeOrderRedisService.getActiveOrder(
      orderId.toString(),
    );
    const driver = await this.driverRedisService.getOnlineDriverMetaData(
      order.driverId,
    );
    // 2) Totals
    const providerShare =
      order.costEstimateForRider - order.costEstimateForDriver;

    const tip = 0;
    const alreadyPaid = order.totalPaid ?? 0;

    // What the rider still owes for this trip (fare+tip minus alreadyPaid)
    let remainingDue = order.costEstimateForRider + tip - alreadyPaid;

    // Apply cash if supplied
    if (cashAmount > 0) {
      remainingDue = Math.max(0, remainingDue - cashAmount);

      // If cash was given but mode isn't Cash, flip it for history clarity
      if (order.paymentMethod.mode !== PaymentMode.Cash) {
        await this.activeOrderRedisService.updateOrderStatus(order.id, {
          paymentMethod: {
            mode: PaymentMode.Cash,
          },
        });
        order.paymentMethod.mode = PaymentMode.Cash;
      }
    }

    // 3) Try to settle the remainder based on payment mode
    const ensurePostPay = async () => {
      await this.activeOrderRedisService.updateOrderStatus(order.id, {
        status: OrderStatus.WaitingForPostPay,
      });
      return order; // Return the order for further processing
    };

    switch (order.paymentMethod.mode) {
      case PaymentMode.Cash: {
        // Rider must have covered all due in cash
        if (remainingDue > 0) return await ensurePostPay();
        break;
      }

      case PaymentMode.Wallet: {
        const credit =
          await this.sharedRiderWalletService.getRiderCreditInCurrency(
            parseInt(order.riderId),
            order.currency,
          );
        if (credit < remainingDue) return await ensurePostPay();
        break; // we’ll deduct after settlements below
      }

      case PaymentMode.SavedPaymentMethod: {
        // If wallet covers it (and allowed), we’ll use wallet; otherwise capture the authorization.
        const walletCredit =
          await this.sharedRiderWalletService.getRiderCreditInCurrency(
            parseInt(order.riderId),
            order.currency,
          );

        if (deduceFromWallet && walletCredit >= remainingDue) {
          break; // wallet can handle it; we’ll deduct later
        }

        // Try capture last authorized payment for this order
        const auth = await this.paymentRepository.find({
          where: {
            userType: 'rider',
            userId: order.riderId.toString(),
            status: PaymentStatus.Authorized,
            orderNumber: order.id.toString(),
          },
          order: { id: 'DESC' },
          take: 1,
        });

        if (auth.length === 0) return await ensurePostPay();

        const capture = await firstValueFrom(
          this.httpService.get<{ status: 'OK' | 'FAILED' }>(
            `${process.env.GATEWAY_SERVER_URL}/capture?id=${auth[0].transactionNumber}&amount=${remainingDue}`,
          ),
        );

        if (capture.data.status !== 'OK') return await ensurePostPay();

        // capture succeeded → remaining is now 0
        remainingDue = 0;
        break;
      }

      case PaymentMode.PaymentGateway: {
        // Async/off-platform flow; let post-pay handle it
        return await ensurePostPay();
      }
    }

    // If anything still unpaid, move to post-pay and stop here
    if (remainingDue > 0) return await ensurePostPay();

    // 4) Settle wallets & payouts
    // 4a) Commission: deduct from driver wallet
    await this.driverService.rechargeWallet({
      status: TransactionStatus.Done,
      driverId: parseInt(order.driverId!),
      currency: order.currency,
      action: TransactionAction.Deduct,
      deductType: DriverDeductTransactionType.Commission,
      amount: -providerShare,
      requestId: parseInt(order.id),
    });

    // 4b) Split commission with fleet/provider
    let fleetShare = 0;
    if (driver.fleetId) {
      const fleet = await this.sharedFleetService.getFleetById(
        parseInt(driver.fleetId),
      );
      fleetShare =
        (providerShare * fleet.commissionSharePercent) / 100 +
        fleet.commissionShareFlat;

      if (fleetShare > 0) {
        await this.sharedFleetService.rechargeWallet({
          fleetId: driver.fleetId == null ? null : parseInt(driver.fleetId),
          action: TransactionAction.Recharge,
          rechargeType: ProviderRechargeTransactionType.Commission,
          amount: fleetShare,
          currency: order.currency,
          requestId: parseInt(order.id),
          driverId: parseInt(order.driverId!),
        });
      }
    }

    await this.sharedProviderService.rechargeWallet({
      action: TransactionAction.Recharge,
      rechargeType: ProviderRechargeTransactionType.Commission,
      currency: order.currency,
      requestId: parseInt(order.id),
      amount: providerShare - fleetShare,
    });

    // 4c) Credit driver for non-cash portion + tip
    // (matches your existing logic; cash was handed directly to driver)
    const driverNonCash = order.costEstimateForDriver - cashAmount + tip;
    if (driverNonCash > 0) {
      await this.driverService.rechargeWallet({
        status: TransactionStatus.Done,
        driverId: parseInt(order.driverId!),
        currency: order.currency,
        requestId: parseInt(order.id),
        action: TransactionAction.Recharge,
        rechargeType: DriverRechargeTransactionType.OrderFee,
        amount: driverNonCash,
      });

      // Optional instant payout for non-cash received (no extra cash subtraction here)
      const payoutAccount =
        await this.driverService.getDriverDefaultPayoutAccount(
          parseInt(order.driverId!),
        );
      if (
        payoutAccount?.payoutMethod?.isInstantPayoutEnabled &&
        driverNonCash > 0
      ) {
        await this.driverService.payout({
          driverId: parseInt(order.driverId!),
          amount: driverNonCash,
          currency: order.currency,
          requestId: parseInt(order.id),
          action: TransactionAction.Deduct,
          deductType: DriverDeductTransactionType.Withdraw,
          payoutAccountId: payoutAccount.id,
        });
      }
    }

    // 4d) Deduct rider wallet (if any wallet-covered remainder)
    // remainingDue was verified 0 above. Wallet deduction amount is the part of that 0 which wallet was supposed to cover:
    // Compute from inputs to avoid confusion:
    // totalDueBeforeCash = costAfterCoupon + tip - alreadyPaid
    // walletPart = max(0, totalDueBeforeCash - cashAmount - capturedFromGateway)
    // Since we don’t track capture amount separately here, use the simple guard:
    const riderDeductAmount =
      order.paymentMethod.mode === PaymentMode.Wallet ||
      (order.paymentMethod.mode === PaymentMode.SavedPaymentMethod &&
        deduceFromWallet)
        ? Math.max(
            0,
            order.costEstimateForRider + tip - alreadyPaid - cashAmount,
          )
        : 0;

    if (riderDeductAmount > 0) {
      await this.sharedRiderWalletService.rechargeWallet({
        status: TransactionStatus.Done,
        action: TransactionAction.Deduct,
        deductType: RiderDeductTransactionType.OrderFee,
        currency: order.currency,
        requestId: parseInt(order.id),
        amount: -riderDeductAmount,
        riderId: parseInt(order.riderId!),
      });
    }

    // 5) Close order
    await this.saveActiveOrderToDisk(
      {
        ...order,
        totalPaid: order.costEstimateForRider,
        status: OrderStatus.Finished,
      },
      {
        finishTimestamp: new Date(),
      },
    );
    await this.activeOrderRedisService.deleteOrder(order.id);
    await this.activityRepository.insert({
      requestId: parseInt(order.id),
      type: RequestActivityType.Paid,
    });

    return null;
  }

  async assignOrderToDriver(orderId: number, driverId: number): Promise<void> {
    // 1) Fetch offer/active state + driver meta in parallel
    const [rideOffer, activeOrder, driver] = await Promise.all([
      this.rideOfferRedisService.getRideOfferMetadata(orderId.toString()),
      this.activeOrderRedisService.getActiveOrder(orderId.toString()),
      this.driverRedisService.getOnlineDriverMetaData(driverId.toString()),
    ]);

    if (!driver) return; // driver went offline

    // Determine source of truth for rider + waypoints
    let riderId: string | undefined;
    let waypoints: WaypointBase[] | undefined;

    if (rideOffer) {
      riderId = rideOffer.riderId!;
      waypoints = rideOffer.waypoints;
    } else if (activeOrder) {
      riderId = activeOrder.riderId!;
      waypoints = activeOrder.waypoints;
    } else {
      // Nothing to assign
      return;
    }

    // Fetch rider
    const rider = await this.riderRedisService.getOnlineRider(riderId);
    if (!rider || !waypoints?.length) return;

    // 2) Compute travel metrics (parallel where possible)
    const pickupPoint = waypoints[0].location;

    const [driverTravel, tripTravel] = await Promise.all([
      driver.location
        ? this.googleServices.getSumDistanceAndDuration([
            driver.location,
            pickupPoint,
          ])
        : Promise.resolve({ distance: 0, duration: 0, directions: [] }),
      this.googleServices.getSumDistanceAndDuration(
        waypoints.map((w) => w.location),
      ),
    ]);

    const now = Date.now();
    const etaPickup = new Date(now + driverTravel.duration * 1000);
    const etaDropoff = new Date(
      etaPickup.getTime() + tripTravel.duration * 1000,
    );

    // 3) Update state (offer vs active)
    if (rideOffer) {
      await this.rideOfferRedisService.acceptOfferByDriver({
        orderId: orderId.toString(),
        driverId: driverId.toString(),
        pickupEta: etaPickup,
        dropoffEta: etaDropoff,
        driverDirections: driverTravel.directions,
      });
    } else {
      // Transition active order to this driver, notify the previous one if any
      await this.activeOrderRedisService.updateOrderStatus(orderId.toString(), {
        driverId: driverId.toString(),
      });

      if (
        activeOrder?.driverId &&
        activeOrder.driverId !== driverId.toString()
      ) {
        const prevDriver =
          await this.driverRedisService.getOnlineDriverMetaData(
            activeOrder.driverId,
          );
        this.pubsubService.publish(
          'driver.event',
          { driverId },
          {
            type: DriverEventType.ActiveOrderCompleted,
            orderId,
            driverId: parseInt(prevDriver.id),
          },
        );

        const prevToken = prevDriver?.fcmTokens?.[0];
        if (prevToken) this.driverNotificationService.canceled(prevToken);
      }
    }

    // 4) Notify both sides
    this.pubsubService.publish(
      'driver.event',
      {
        driverId,
      },
      {
        type: DriverEventType.ActiveOrderAssigned,
        orderId,
        driverId: parseInt(driver.id),
      },
    );
    const driverToken = driver.fcmTokens?.[0];
    if (driverToken) {
      this.driverNotificationService.assigned(
        driverToken,
        etaPickup.toISOString(),
        waypoints[0].address,
        waypoints[waypoints.length - 1].address,
      );
    }

    const riderToken = rider.fcmTokens?.[0];
    if (riderToken)
      this.riderNotificationService.bookingAssigned(riderToken, 'now');

    // PubSub update for rider app
    this.pubsubService.publish(
      'rider.order.updated',
      {
        riderId: parseInt(riderId),
      },
      {
        type: RiderOrderUpdateType.DriverAssigned,
        driver: {
          ...driver,
          fullName:
            driver!.firstName == null && driver!.lastName == null
              ? null
              : [driver!.firstName, driver!.lastName].filter(Boolean).join(' '),
          profileImageUrl: driver.avatarImageAddress,
          vehicleName: driver.vehicleName,
          vehicleColor: driver.vehicleColor,
          vehiclePlate: driver.vehiclePlate,
          location: driver!.location,
        },
        orderId,
        status: OrderStatus.DriverAccepted,
        pickupEta: etaPickup,
        riderId: parseInt(rider.id),
      },
    );

    // 5) Persist order record
    await this.orderRepository.update(orderId, {
      status: OrderStatus.DriverAccepted,
      pickupEta: etaPickup,
      dropOffEta: etaDropoff,
      driverId,
    });
  }
}

enum CalculateFareError {
  RegionUnsupported = 'REGION_UNSUPPORTED',
  NoServiceInRegion = 'NO_SERVICE_IN_REGION',
}
