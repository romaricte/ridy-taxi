import {
  Field,
  InterfaceType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Point } from './point';
import { DeliveryContactDTO } from './delivery-contact.dto';

export enum WaypointRole {
  Pickup = 'pickup',
  Stop = 'stop',
  Dropoff = 'dropoff',
}
registerEnumType(WaypointRole, {
  name: 'WaypointRole',
});

export enum WaypointService {
  Ride = 'ride',
  Delivery = 'delivery',
  Shop = 'shop',
}
registerEnumType(WaypointService, {
  name: 'WaypointService',
});

@InterfaceType({
  resolveType: (value: WaypointBase) => {
    if (value.service === WaypointService.Ride) return RideWaypoint;
    if (value.service === WaypointService.Delivery) return DeliveryWaypoint;
    if (value.service === WaypointService.Shop) return ShopWaypoint;
    return null;
  },
})
export abstract class WaypointBase {
  @Field(() => Point)
  location: Point;
  @Field(() => String)
  address: string;
  @Field(() => WaypointRole)
  role: WaypointRole;
  @Field(() => WaypointService)
  service: WaypointService;
  @Field(() => DeliveryContactDTO, { nullable: true })
  deliveryContact?: DeliveryContactDTO;
  @Field(() => String, { nullable: true })
  shopName?: string;
  @Field(() => String, { nullable: true })
  shopAddress?: string;
  @Field(() => String, { nullable: true })
  shopImageUrl?: string;
}

@ObjectType('RideWaypoint', { implements: [WaypointBase] })
export class RideWaypoint implements WaypointBase {
  location: Point;
  address: string;
  role: WaypointRole;
  service: WaypointService;
}

@ObjectType('DeliveryWaypoint', { implements: [WaypointBase] })
export class DeliveryWaypoint implements WaypointBase {
  location: Point;
  address: string;
  role: WaypointRole;
  service: WaypointService;
  @Field(() => DeliveryContactDTO, { nullable: true })
  deliveryContact?: DeliveryContactDTO;
}

@ObjectType('ShopWaypoint', { implements: [WaypointBase] })
export class ShopWaypoint implements WaypointBase {
  location: Point;
  address: string;
  role: WaypointRole;
  service: WaypointService;
  @Field(() => String)
  shopImageUrl!: string;

  @Field(() => String)
  shopName!: string;

  @Field(() => String)
  shopAddress!: string;
}
