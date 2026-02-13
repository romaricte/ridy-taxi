import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

@ObjectType('ChatMessage')
export class ChatMessageDTO {
  @Field(() => String)
  message!: string;
  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
  @Field(() => Boolean)
  isFromMe!: boolean;
  @Field(() => GraphQLISODateTime, { nullable: true })
  seenAt?: Date;
  @Field(() => String, { nullable: true })
  senderFullName?: string;
}
