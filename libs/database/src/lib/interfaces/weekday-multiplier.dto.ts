import { InputType, ObjectType, registerEnumType, Field, Float } from '@nestjs/graphql';

@InputType('WeekdayMultiplierInput')
@ObjectType()
export class WeekdayMultiplier {
  @Field(() => Weekday, { nullable: false })
    weekday!: Weekday;
  @Field(() => Float, { nullable: false })
    multiply!: number;
}

export enum Weekday {
  Sunday = 'Sunday',
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday',
}

registerEnumType(Weekday, {
  name: 'Weekday',
});
