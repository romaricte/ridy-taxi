import {
  Field,
  GraphQLISODateTime,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { LicenseType } from './config.dto';
import { AppType } from '../entities/enums/app-type.enum';
import { PlatformAddOn } from 'license-verify';

@ObjectType('License')
export class License {
  @Field(() => String)
  buyerName!: string;
  @Field(() => LicenseType)
  licenseType!: LicenseType;
  @Field(() => GraphQLISODateTime, { nullable: true })
  supportExpireDate?: Date;
  @Field(() => [AppType])
  connectedApps!: AppType[];
  @Field(() => [PlatformAddOn])
  platformAddons!: PlatformAddOn[];
}
registerEnumType(PlatformAddOn, {
  name: 'PlatformAddOn',
});
