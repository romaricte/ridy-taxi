import { registerEnumType } from '@nestjs/graphql/dist/type-factories/register-enum-type.factory';

export enum TaxiOrderDriverStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout',
}

registerEnumType(TaxiOrderDriverStatus, {
  name: 'TaxiOrderDriverStatus',
  description: 'The status of a taxi order driver',
});
