import { Transform } from 'class-transformer';

export enum DriverEphemeralMessageType {
  RateRider = 'RateRider',
  RiderCanceled = 'RiderCanceled',
  AddPayoutMethod = 'AddPayoutMethod',
}

export class DriverEphemeralMessageSnapshot {
  type: DriverEphemeralMessageType;
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  expiresAt: Date;
  @Transform(({ value }) => new Date(value), { toClassOnly: true })
  @Transform(({ value }) => value.getTime(), { toPlainOnly: true })
  createdAt: Date;
  riderFullName!: string | null;
  orderId!: number;
  riderProfileUrl!: string | null;
  serviceName!: string | null;
  serviceImageUrl!: string | null;
}
