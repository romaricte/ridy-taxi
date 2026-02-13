import { InputType, ObjectType, Field } from '@nestjs/graphql';
import { PhoneNumberDTO } from './phone-number.dto';

@ObjectType('DeliveryContact')
@InputType('DeliveryContactInput')
export class DeliveryContactDTO {
  @Field(() => String, { nullable: false })
  name!: string;
  @Field(() => PhoneNumberDTO, { nullable: false })
  phoneNumber!: PhoneNumberDTO;
  @Field(() => String, { nullable: true })
  email?: string;
  @Field(() => String, { nullable: false })
  addressLine1!: string;
  @Field(() => String, { nullable: true })
  addressLine2?: string;
  @Field(() => String, { nullable: true })
  zone?: string;
  @Field(() => String, { nullable: true })
  buildingNumber?: string;
  @Field(() => String, { nullable: true })
  apartmentNumber?: string;
  @Field(() => String, { nullable: true })
  city?: string;
  @Field(() => String, { nullable: true })
  state?: string;
  @Field(() => String, { nullable: true })
  instructions?: string;
  @Field(() => String, { nullable: true })
  postalCode?: string;
  @Field(() => String, { nullable: true })
  companyName?: string;
}
