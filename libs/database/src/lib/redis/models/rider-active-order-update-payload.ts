import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { ChatMessageDTO } from '../../interfaces/chat-message.dto';
import { OrderStatus, Point, WaypointBase } from '@ridy/database';
import { Type } from 'class-transformer';

@ObjectType('ActiveOrderDriver')
export class ActiveOrderDriverDTO {
  @Field(() => Point, { nullable: true })
  location?: Point;
  @Field(() => String, { nullable: true })
  fullName!: string | null;
  @Field(() => ID, { nullable: true })
  profileImageUrl?: string;
  @Field(() => Int, {
    nullable: true,
    description: 'Driver Rating. Between 0 to 100',
  })
  rating?: number;
  @Field(() => String, { nullable: true })
  mobileNumber!: string;
  @Field(() => String, { nullable: true })
  vehicleName?: string;
  @Field(() => String, { nullable: true })
  vehicleColor?: string;
  @Field(() => String, { nullable: true })
  vehiclePlate?: string;
}

@ObjectType('RiderActiveOrderUpdate')
export class RiderActiveOrderUpdateDTO {
  @Field(() => RiderOrderUpdateType)
  type!: RiderOrderUpdateType;
  @Field(() => ID)
  orderId!: number;
  @Field(() => ID)
  riderId!: number;
  @Field(() => ChatMessageDTO, { nullable: true })
  @Type(() => ChatMessageDTO)
  message?: ChatMessageDTO;
  @Field(() => Int, { nullable: true })
  unreadMessagesCount?: number;
  @Field(() => OrderStatus, { nullable: true })
  status?: OrderStatus;
  @Field(() => Point, { nullable: true })
  driverLocation?: Point;
  @Field(() => GraphQLISODateTime, { nullable: true })
  pickupEta?: Date;
  @Field(() => [Point], { nullable: true })
  directions?: Point[];
  @Field(() => ActiveOrderDriverDTO, { nullable: true })
  driver?: ActiveOrderDriverDTO;
  @Field(() => WaypointBase, { nullable: true })
  nextDestination?: WaypointBase;
}

export enum RiderOrderUpdateType {
  StatusUpdated = 'StatusUpdated',
  NewMessageReceived = 'NewMessageReceived',
  DriverLocationUpdated = 'DriverLocationUpdated',
  DriverAssigned = 'DriverAssigned',
  DriverCancelled = 'DriverCancelled',
  OrderCompleted = 'OrderCompleted',
  NewEphemeralMessage = 'NewEphemeralMessage',
}

registerEnumType(RiderOrderUpdateType, {
  name: 'RiderOrderUpdateType',
  description: 'Types of updates for taxi orders',
});

export const RiderActiveOrderUpdateName = 'RIDER_ACTIVE_ORDER_UPDATED';
