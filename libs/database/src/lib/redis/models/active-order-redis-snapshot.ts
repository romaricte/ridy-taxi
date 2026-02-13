import { Transform } from 'class-transformer';
import { Point, RideOptionDTO, WaypointBase } from '../../interfaces';
import { OrderStatus, TaxiOrderType } from '@ridy/database';
import { PaymentMethodBase } from 'src/lib/interfaces/payment-method.dto';

export class ActiveOrderRedisSnapshot {
  id: string;
  status: OrderStatus;
  type: TaxiOrderType;
  currency: string;
  waypoints: WaypointBase[];
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  createdAt: Date;
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  pickupEta: Date;
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  dropoffEta: Date;
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  scheduledAt?: Date;
  driverId: string;
  riderId: string;
  waitMinutes?: number;
  couponCode?: string;
  couponDiscount?: number;
  serviceId: string;
  fleetId?: string;
  serviceName: string;
  serviceImageAddress: string;
  driverDirections: Point[];
  tripDirections: Point[];
  paymentMethod: PaymentMethodBase;
  costEstimateForDriver: number;
  costEstimateForRider: number;
  estimatedDistance: number;
  estimatedDuration: number;
  currentLegIndex: number;
  totalPaid: number;
  options: RideOptionDTO[];
  chatMessages: ChatMessageRedisSnapshot[];
}

export class ChatMessageRedisSnapshot {
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  createdAt: Date;
  isFromDriver: boolean;
  seenByRiderAt?: Date;
  seenByDriverAt?: Date;
  content: string;
}
