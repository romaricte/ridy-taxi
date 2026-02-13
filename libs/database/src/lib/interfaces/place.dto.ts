import { Field, ObjectType } from '@nestjs/graphql';
import { Point } from './point';

@ObjectType()
export class PlaceDTO {
  @Field(() => Point)
  point!: Point;
  @Field(() => String, { nullable: true })
  title?: string;
  @Field(() => String)
  address!: string;
}
