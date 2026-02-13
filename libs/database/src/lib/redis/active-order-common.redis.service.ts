import { Inject, Injectable, Logger } from '@nestjs/common';
import { ActiveOrderRedisSnapshot } from './models/active-order-redis-snapshot';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { OrderStatus, TaxiOrderType } from '../entities';
import { Point, RideOptionDTO, WaypointBase } from '../interfaces';
import { TaxiServiceRedisService } from './taxi-service.redis.service';
import { PaymentMethodBase } from '../interfaces/payment-method.dto';
import { REDIS } from './redis-token';
import { RedisClientType } from 'redis';

@Injectable()
export class ActiveOrderCommonRedisService {
  constructor(
    @Inject(REDIS) private readonly redisService: RedisClientType,
    private readonly taxiServiceRedisService: TaxiServiceRedisService,
  ) {}

  async getActiveOrders(
    orderId: string[],
  ): Promise<ActiveOrderRedisSnapshot[]> {
    const pipeline = this.redisService.multi();
    for (const id of orderId) {
      pipeline.json.get(`active_order:${id}`);
    }
    const results = await pipeline.exec();
    const orders: ActiveOrderRedisSnapshot[] = [];
    results.forEach((result, idx) => {
      if (result === null) {
        return;
      }
      const inst = plainToInstance(ActiveOrderRedisSnapshot, result);
      if (inst) {
        orders.push(inst);
      } else {
        Logger.debug(
          `Failed to transform active order for id ${orderId[idx]}, result: ${JSON.stringify(
            result,
          )}`,
        );
      }
    });
    return orders;
  }

  async getActiveOrder(orderId: string): Promise<ActiveOrderRedisSnapshot> {
    const result = await this.redisService.json.get(`active_order:${orderId}`);
    return result === null
      ? null
      : plainToInstance(ActiveOrderRedisSnapshot, result);
  }

  async addMessageToOrder(input: {
    orderId: string;
    message: string;
    user: 'rider' | 'driver';
  }) {
    const order = await this.getActiveOrder(input.orderId);
    if (!order) {
      throw new Error(`Active order with ID ${input.orderId} not found`);
    }
    order.chatMessages.push({
      content: input.message,
      createdAt: new Date(),
      isFromDriver: input.user === 'driver',
    });
    await this.redisService.json.set(
      `active_order:${input.orderId}`,
      '$.chatMessages',
      instanceToPlain(order.chatMessages),
    );
  }

  async createActiveOrder(input: {
    id: string;
    status: OrderStatus;
    type: TaxiOrderType;
    currency: string;
    createdAt: Date;
    scheduledAt?: Date;
    pickupEta: Date;
    waitMinutes?: number;
    dropoffEta: Date;
    driverId: string;
    riderId: string;
    fleetId?: string;
    serviceId: string;
    serviceName: string;
    serviceImageAddress: string;
    estimatedDistance: number;
    estimatedDuration: number;
    driverDirections: Point[];
    tripDirections: Point[];
    couponCode?: string;
    couponDiscount?: number;
    paymentMethod: PaymentMethodBase;
    costEstimateForRider: number;
    costEstimateForDriver: number;
    totalPaid: number;
    waypoints: WaypointBase[];
    options: RideOptionDTO[];
  }): Promise<void> {
    const activeOrder: ActiveOrderRedisSnapshot = {
      ...input,
      currentLegIndex: 0,
      chatMessages: [],
    };
    await this.redisService.json.set(
      `active_order:${activeOrder.id}`,
      '$',
      instanceToPlain(activeOrder),
    );
  }

  async deleteOrder(orderId: string) {
    const order = await this.getActiveOrder(orderId);
    if (!order) return;

    const riderKey = `rider:${order.riderId}`;
    const driverKey = order.driverId ? `driver:${order.driverId}` : undefined;
    const orderKey = `active_order:${orderId}`;
    await this.redisService.unlink(orderKey);
    const arrPopIfPresent = async (key: string, path = '$.activeOrderIds') => {
      // If the whole key is missing, bail early
      const exists = await this.redisService.exists(key);
      if (!exists) {
        Logger.debug(`Key ${key} does not exist, skipping array pop`);
        return;
      }

      // Try numeric match first
      let idxResp = await this.redisService.json.arrIndex(key, path, orderId);
      Logger.debug(
        `Array index response for ${key}${path}: ${idxResp} ${typeof idxResp}`,
      );
      let idx = parseInt(idxResp as unknown as string, 10);

      if (idx >= 0) {
        Logger.debug(
          `Removing orderId ${orderId} at index ${idx} from ${key}${path}`,
        );
        await this.redisService.json.arrPop(key, {
          path,
          index: idx,
        });
      } else {
        Logger.debug(`OrderId ${orderId} not found in ${key}${path}`);
      }
    };
    await arrPopIfPresent(riderKey);
    if (driverKey) {
      await arrPopIfPresent(driverKey);
    }
  }

  async updateOrderStatus(
    id: string,
    update: Partial<ActiveOrderRedisSnapshot>,
  ) {
    const pipeline = this.redisService.multi();
    Object.entries(update).forEach(([key, value]) => {
      pipeline.json.set(
        `active_order:${id}`,
        `$.${key}`,
        instanceToPlain(value),
      );
    });
    await pipeline.exec();
  }

  async updateOrderWaitTime(
    orderId: string,
    waitMinutes: number,
  ): Promise<ActiveOrderRedisSnapshot> {
    const pipeline = this.redisService.multi();
    const order = await this.getActiveOrder(orderId);
    const service = await this.taxiServiceRedisService.getTaxiServiceById(
      order.serviceId,
    );
    const previousWaitCost =
      service.waitCostPerMinute * (order.waitMinutes ?? 0);
    const newWaitCost = service.waitCostPerMinute * waitMinutes;

    pipeline.json.set(`active_order:${orderId}`, '$.waitMinutes', waitMinutes);
    pipeline.json.set(
      `active_order:${orderId}`,
      '$.costEstimateForRider',
      order.costEstimateForRider - previousWaitCost + newWaitCost,
    );
    pipeline.json.set(
      `active_order:${orderId}`,
      '$.costEstimateForDriver',
      order.costEstimateForDriver - previousWaitCost + newWaitCost,
    );
    await pipeline.exec();
    return this.getActiveOrder(orderId);
  }
}
