import {
  Field,
  Float,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { ChatMessageDTO } from '../../interfaces/chat-message.dto';
import { OrderStatus } from '../../entities';
import { RideOfferDTO } from '../../interfaces';

@ObjectType('DriverEventPayload')
export class DriverEventPayload {
  @Field(() => DriverEventType)
  type!: DriverEventType;
  @Field(() => ID)
  orderId!: number;
  @Field(() => ID)
  driverId!: number;
  @Field(() => Int, { nullable: true })
  unreadMessagesCount?: number;
  @Field(() => ChatMessageDTO, { nullable: true })
  message?: ChatMessageDTO;
  @Field(() => OrderStatus, { nullable: true })
  status?: OrderStatus;
  @Field(() => Int, { nullable: true })
  waitTime?: number;
  @Field(() => Float, { nullable: true })
  totalCost?: number;
  @Field(() => RideOfferDTO, { nullable: true })
  rideOffer?: RideOfferDTO;
}

export enum DriverEventType {
  ActiveOrderUpdated = 'OrderUpdated',
  RideOfferReceived = 'RideOfferReceived',
  RideOfferRevoked = 'RideOfferRevoked',
  MessageReceived = 'MessageReceived',
  ActiveOrderCompleted = 'ActiveOrderCompleted',
  ActiveOrderAssigned = 'ActiveOrderAssigned',
}

registerEnumType(DriverEventType, {
  name: 'DriverEventType',
  description: 'Types of events that can be sent to the driver',
});

export const DriverEventSubscriptionName = 'ON_DRIVER_EVENT';
