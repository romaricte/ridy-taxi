import { InputType, ObjectType, Field } from '@nestjs/graphql';

@ObjectType('PhoneNumber')
@InputType('PhoneNumberInput')
export class PhoneNumberDTO {
  @Field(() => String, { nullable: false })
  countryCode!: string;
  @Field(() => String, { nullable: false })
  number!: string;
}
