import { InputType, ObjectType, Field, Float } from "@nestjs/graphql";

@InputType('DistanceMultiplierInput')
@ObjectType()
export class DistanceMultiplier {
    @Field(() => Float, { nullable: false })
    distanceFrom!: number;
    @Field(() => Float, { nullable: false })
    distanceTo!: number;
    @Field(() => Float, { nullable: false })
    multiply!: number;
}