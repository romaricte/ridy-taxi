import { InputType, ObjectType, Field } from '@nestjs/graphql';
import { Weekday } from './weekday-multiplier.dto';

@ObjectType('WeekdaySchedule')
@InputType('WeekdayScheduleInput')
export class WeekdayScheduleDTO {
  @Field(() => Weekday, { nullable: false })
    weekday!: Weekday;
  @Field(() => [TimeRangeDTO], { nullable: false })
    openingHours!: TimeRangeDTO[];
}

@ObjectType('TimeRange')
@InputType('OpeningHoursInput')
export class TimeRangeDTO {
  @Field(() => String, { nullable: false })
    open!: string;
  @Field(() => String, { nullable: false })
    close!: string;
}
