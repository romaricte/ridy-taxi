import { Transform } from 'class-transformer';
import { Point } from '../../interfaces';
import { PayoutMethodType } from '../../entities';

export class DriverRedisSnapshot {
  id: string;
  @Transform(
    ({ value }) => {
      if (typeof value !== 'string') {
        return value;
      }
      return {
        lat: parseFloat(value.split(',')[1]),
        lng: parseFloat(value.split(',')[0]),
      };
    },
    { toClassOnly: true },
  )
  location: Point;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  vehicleName?: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  avatarImageAddress: string;
  walletCredit!: number;
  currency!: string;
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  locationTime: Date;
  heading: number;
  fcmTokens?: string[];
  searchDistance?: number;
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  idleStart: Date;
  acceptedOrdersCount: number;
  rejectedOrdersCount: number;
  serviceIds: string[] = [];
  fleetId?: string;
  rating?: number;
  activeOrderIds: string[];
  assignedRiderIds: string[];
  rideOfferIds: string[];
}

export class PayoutAccountRedisSnapshot {
  id: string;
  type: PayoutMethodType;
  accountName: string;
  accountNumber: string;
}
