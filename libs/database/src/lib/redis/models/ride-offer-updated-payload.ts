import { registerEnumType } from '@nestjs/graphql';
import { RideOfferDTO } from '../../interfaces/ride-offer.dto';

export class RideOfferUpdatedPayload {
  type: RideOfferUpdateType;
  driverId: string;
  orderId!: string;
  rideOffer?: RideOfferDTO;
}

export enum RideOfferUpdateType {
  Assigned = 'Assigned',
  Revoked = 'Revoked',
}

registerEnumType(RideOfferUpdateType, {
  name: 'RideOfferUpdateType',
});

export const RideOfferUpdatedName = 'RIDE_OFFER_UPDATED';
