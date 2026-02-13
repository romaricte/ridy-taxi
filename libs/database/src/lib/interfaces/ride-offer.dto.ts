import {
  Field,
  Float,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { ServiceOptionIcon, TaxiOrderType } from '../entities';
import { Point, WaypointBase } from '.';

@ObjectType('RideOffer')
export class RideOfferDTO {
  @Field(() => ID)
  id: number;

  @Field(() => TaxiOrderType)
  type: TaxiOrderType;

  @Field(() => String)
  currency: string;

  @Field(() => [WaypointBase])
  waypoints: WaypointBase[];

  @Field(() => Int, {
    description: 'The total distance in meters for the order.',
  })
  distance: number;

  @Field(() => Int, {
    description: 'The total duration in seconds for the order.',
  })
  duration: number;

  @Field(() => [Point], {
    description: 'The directions for the order from driver to passenger.',
  })
  directions: Point[];

  @Field(() => GraphQLISODateTime, { nullable: true })
  dispatchedToUserAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  expiresAt?: Date;

  @Field(() => Float)
  fareEstimate: number;

  @Field(() => String)
  serviceName: string;

  @Field(() => String)
  serviceImageAddress: string;

  @Field(() => [RideOptionDTO])
  options!: RideOptionDTO[];
}

@ObjectType('RideOption')
export class RideOptionDTO {
  @Field(() => String)
  name: string;

  @Field(() => ServiceOptionIcon)
  icon: ServiceOptionIcon;
}
