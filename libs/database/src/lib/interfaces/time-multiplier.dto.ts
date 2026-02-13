import { InputType, ObjectType, Field, Float } from "@nestjs/graphql";

@InputType('TimeMultiplierInput')
@ObjectType()
export class TimeMultiplier {
    @Field(() => String, { nullable: false })
    startTime!: string;
    @Field(() => String, { nullable: false })
    endTime!: string;
    @Field(() => Float, { nullable: false })
    multiply!: number;
}