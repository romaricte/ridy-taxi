import { InputType, ObjectType, Field, Float } from '@nestjs/graphql';

@InputType('DateRangeMultiplierInput')
@ObjectType()
export class DateRangeMultiplier {
  @Field(() => Float, { nullable: false })
    startDate!: number;
  @Field(() => Float, { nullable: false })
    endDate!: number;
  @Field(() => Float, { nullable: false })
    multiply!: number;
}
