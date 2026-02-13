import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Point } from '../../interfaces/point';
import { MultipointTransformer } from '../../transformers/multipoint.transformer';
import { TaxiSupportRequestEntity } from './taxi-support-request.entity';
import { CouponEntity } from '../coupon.entity';
import { DriverTransactionEntity } from './driver-transaction.entity';
import { DriverEntity } from './driver.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { FeedbackEntity } from './feedback.entity';
import { FleetTransactionEntity } from './fleet-transaction.entity';
import { OrderMessageEntity } from './request-message.entity';
import { PaymentGatewayEntity } from '../payment-gateway.entity';
import { ProviderTransactionEntity } from '../provider-transaction.entity';
import { CustomerEntity } from '../customer.entity';
import { RiderTransactionEntity } from '../rider-transaction.entity';
import { ServiceEntity } from './service.entity';
import { OperatorEntity } from '../operator.entity';
import { RequestActivityEntity } from './request-activity.entity';
import { ServiceOptionEntity } from './service-option.entity';
import { SOSEntity } from './sos.entity';
import { FleetEntity } from './fleet.entity';
import { OrderCancelReasonEntity } from './order-cancel-reason.entity';
import { PaymentMode } from '../enums/payment-mode.enum';
import { SavedPaymentMethodEntity } from '../saved-payment-method.entity';
import { RiderReviewEntity } from './rider-review.entity';
import { RegionEntity } from './region.entity';
import { CampaignCodeEntity } from '../campaign-code.entity';
import { TaxiOrderNoteEntity } from './taxi-order-note.entity';
import { TaxiOrderType } from './enums/taxi-order-type.enum';
import { DeliveryContact } from '../fragments/delivery-contact';
import { TaxiOrderShopEntity } from './taxi-order-shop.entity';
import {
  DeliveryWaypoint,
  RideWaypoint,
  ShopWaypoint,
  WaypointBase,
  WaypointRole,
  WaypointService,
  PaymentMethodBase,
  PlaceDTO,
} from '../../interfaces';

@Entity('request')
export class TaxiOrderEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ name: 'requestTimestamp' })
  createdOn!: Date;

  @Column('enum', {
    enum: TaxiOrderType,
    default: TaxiOrderType.Ride,
  })
  type!: TaxiOrderType;

  @Column({ nullable: true })
  startTimestamp?: Date;

  @Column({ nullable: true })
  finishTimestamp?: Date;

  @Column('enum', {
    enum: OrderStatus,
    default: OrderStatus.Requested,
  })
  status!: OrderStatus;

  @Column('int', { default: 0 })
  distanceBest!: number;

  @Column('int', { default: 0 })
  durationBest!: number;

  @Column('int', { default: 0 })
  waitMinutes!: number;

  @Column('float', {
    precision: 10,
    scale: 2,
    default: 0,
  })
  waitCost!: number;

  @Column('float', {
    precision: 10,
    scale: 2,
    default: 0,
  })
  rideOptionsCost!: number;

  @Column('float', {
    precision: 10,
    scale: 2,
    default: 0,
  })
  taxCost!: number;

  @Column('float', {
    precision: 10,
    scale: 2,
    default: 0,
  })
  serviceCost!: number;

  @Column()
  expectedTimestamp: Date;

  @Column({ nullable: true, name: 'etaPickup' })
  pickupEta?: Date;

  @Column({ nullable: true })
  dropOffEta?: Date;

  @Column('float', {
    precision: 10,
    scale: 2,
  })
  costBest!: number;

  @Column('float', {
    precision: 10,
    scale: 2,
    default: '0.00',
  })
  costAfterCoupon!: number;

  @Column('float', {
    precision: 10,
    scale: 2,
    default: '0.00',
  })
  tipAmount?: number;

  @Column('float', {
    default: 0,
    precision: 10,
    scale: 2,
  })
  paidAmount?: number;

  @Column('float', {
    precision: 10,
    default: 0,
    scale: 2,
  })
  providerShare?: number;

  @Column('tinyint', {
    default: -1,
  })
  destinationArrivedTo!: number;

  @ManyToOne(() => RegionEntity, (region) => region.taxiOrders)
  region?: RegionEntity;

  @Column({ nullable: true })
  regionId?: number;

  @OneToMany(() => RequestActivityEntity, (activity) => activity.request)
  activities?: RequestActivityEntity[];

  @Column({
    type: 'text',
    transformer: {
      to(value: string[]): string {
        return value.join('|');
      },
      from(value: string): string[] {
        if (value == null) return [];
        return value.split('|');
      },
    },
  })
  addresses!: string[];

  @Column('multipoint', {
    transformer: new MultipointTransformer(),
  })
  points!: Point[];

  @Column('multipoint', {
    transformer: new MultipointTransformer(),
    nullable: true,
  })
  directions?: Point[];

  @Column('multipoint', {
    transformer: new MultipointTransformer(),
    nullable: true,
  })
  driverDirections?: Point[];

  @Column({
    default: () => 'CURRENT_TIMESTAMP',
  })
  driverLastSeenMessagesAt?: Date;

  @Column({
    default: () => 'CURRENT_TIMESTAMP',
  })
  riderLastSeenMessagesAt?: Date;

  @Column({ type: 'json', nullable: true })
  contacts?: DeliveryContact[];

  @ManyToOne(() => DriverEntity, (driver) => driver.orders, { eager: true })
  driver?: DriverEntity;

  @Column({ nullable: true })
  driverId?: number;

  @ManyToOne(() => CustomerEntity, (rider) => rider.orders, { eager: true })
  rider?: CustomerEntity;

  @Column()
  riderId!: number;

  @ManyToOne(() => CouponEntity, (coupon) => coupon.orders)
  coupon?: CouponEntity;

  @Column({ nullable: true })
  couponId?: number;

  @Column('char', { length: 3 })
  currency!: string;

  @OneToMany(() => OrderMessageEntity, (message) => message.request)
  conversation?: OrderMessageEntity[];

  @Column('enum', {
    enum: PaymentMode,
    nullable: true,
  })
  paymentMode?: PaymentMode;

  @ManyToOne(() => PaymentGatewayEntity, (gateway) => gateway.orders, {
    eager: true,
  })
  paymentGateway?: PaymentGatewayEntity;

  @Column({ nullable: true })
  paymentGatewayId?: number;

  @ManyToOne(() => SavedPaymentMethodEntity, (method) => method.orders, {
    eager: true,
  })
  savedPaymentMethod?: SavedPaymentMethodEntity;

  @Column({ nullable: true })
  savedPaymentMethodId?: number;

  @OneToMany(() => TaxiSupportRequestEntity, (complaint) => complaint.request)
  complaints?: TaxiSupportRequestEntity[];

  @ManyToOne(() => ServiceEntity, (service) => service.requests, {
    eager: true,
  })
  service?: ServiceEntity;

  @Column()
  serviceId?: number;

  @ManyToOne(() => OperatorEntity, (operator) => operator.requests, {
    onDelete: 'CASCADE',
  })
  operator?: OperatorEntity;

  @Column({ nullable: true })
  operatorId?: number;

  @ManyToOne(() => FleetEntity, (fleet) => fleet.requests, {
    onDelete: 'SET NULL',
  })
  fleet?: FleetEntity;

  @Column({ nullable: true })
  fleetId?: number;

  @OneToMany(
    () => RiderTransactionEntity,
    (riderTransaction) => riderTransaction.request,
  )
  riderTransactions?: RiderTransactionEntity[];

  @OneToMany(
    () => FleetTransactionEntity,
    (fleetTransaction) => fleetTransaction.request,
  )
  fleetTransactions?: FleetTransactionEntity[];

  @OneToOne(() => FeedbackEntity, (feedback) => feedback.request)
  review?: FeedbackEntity;

  @OneToMany(
    () => DriverTransactionEntity,
    (transaction) => transaction.request,
  )
  driverTransactions?: DriverTransactionEntity[];

  @OneToMany(
    () => ProviderTransactionEntity,
    (transaction) => transaction.request,
  )
  providerTransactions?: ProviderTransactionEntity[];

  @ManyToMany(() => ServiceOptionEntity, (option) => option.requests, {
    onDelete: 'CASCADE',
  })
  @JoinTable()
  options?: ServiceOptionEntity[];

  @OneToMany(() => SOSEntity, (sos) => sos.request)
  sosCalls?: SOSEntity[];

  @ManyToOne(() => OrderCancelReasonEntity, (order) => order.orders)
  cancelReason?: OrderCancelReasonEntity;

  @Column({
    nullable: true,
  })
  cancelReasonId?: number;

  @Column({
    nullable: true,
  })
  cancelReasonNote?: string;

  @OneToOne(() => RiderReviewEntity, (review) => review.request)
  driverReviewForRider?: RiderReviewEntity;

  @ManyToOne(() => CampaignCodeEntity, (campaignCode) => campaignCode.orders)
  campaignCode?: CampaignCodeEntity;

  @Column({ nullable: true })
  campaignCodeId?: number;

  @OneToMany(() => TaxiOrderNoteEntity, (note) => note.order)
  notes?: TaxiOrderNoteEntity[];

  @OneToMany(() => TaxiOrderShopEntity, (shop) => shop.taxiOrder)
  shopCarts?: TaxiOrderShopEntity[];

  waypoints(): WaypointBase[] {
    switch (this.type) {
      case TaxiOrderType.Ride: {
        const waypoints: RideWaypoint[] = this.points.map((point, index) => ({
          address: this.addresses[index],
          service: WaypointService.Ride,
          location: point,
          role: index === 0 ? WaypointRole.Pickup : WaypointRole.Dropoff,
        }));
        return waypoints;
      }
      case TaxiOrderType.ShopDelivery: {
        const waypoints: ShopWaypoint[] = this.points.map((point, index) => ({
          address: this.addresses[index],
          service: WaypointService.Shop,
          location: point,
          role: index === 0 ? WaypointRole.Pickup : WaypointRole.Dropoff,
          shopName:
            this.shopCarts[index].shopOrderCart.shop.name ??
            'Unknown Shop Name',
          shopAddress:
            this.shopCarts[index].shopOrderCart.shop.address ??
            'Unknown Shop Address',
          shopImageUrl:
            this.shopCarts[index].shopOrderCart.shop.image.address ??
            'Unknown Shop Image URL',
        }));
        return waypoints;
      }
      case TaxiOrderType.ParcelDelivery: {
        const waypoints: DeliveryWaypoint[] = this.points.map(
          (point, index) => ({
            address: this.addresses[index],
            service: WaypointService.Delivery,
            location: point,
            role: index === 0 ? WaypointRole.Pickup : WaypointRole.Dropoff,
            deliveryContact: this.contacts[index],
          }),
        );
        return waypoints;
      }
      default:
        return [];
    }
  }

  places(): PlaceDTO[] {
    return this.points.map((point, index) => ({
      address: this.addresses[index],
      title: this.addresses[index],
      point: point,
    }));
  }

  paymentMethod(): PaymentMethodBase {
    switch (this.paymentMode) {
      case PaymentMode.Cash: {
        return {
          mode: PaymentMode.Cash,
        };
      }
      case PaymentMode.Wallet: {
        return {
          mode: PaymentMode.Wallet,
        };
      }
      case PaymentMode.SavedPaymentMethod: {
        return {
          id: this.savedPaymentMethodId ?? 0,
          name:
            this.savedPaymentMethod.lastFour != null
              ? '*** **** **** ' + this.savedPaymentMethod.lastFour
              : this.savedPaymentMethod.title.length == 4
                ? '*** **** **** ' + this.savedPaymentMethod.title
                : this.savedPaymentMethod.title,
          mode: PaymentMode.SavedPaymentMethod,
          providerBrand: this.savedPaymentMethod?.providerBrand,
          isDefault: false,
        };
      }
      case PaymentMode.PaymentGateway: {
        return {
          id: this.paymentGatewayId ?? 0,
          name: this.paymentGateway?.title ?? 'Unknown',
          mode: PaymentMode.PaymentGateway,
          imageUrl: this.paymentGateway?.media?.address,
          linkMethod: this.paymentGateway?.linkMethod(),
        };
      }
      case null:
        return {
          mode: PaymentMode.Cash,
        };
      default:
        throw Error('Unsupported payment mode');
    }
  }
}
