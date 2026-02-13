import {
  Field,
  Float,
  Int,
  ObjectType,
  registerEnumType,
  ID,
  GraphQLISODateTime,
} from '@nestjs/graphql';
import { License } from './license.dto';
import { AppConfigInfoDTO } from './app-config-info.dto';
import { IDField } from '@ptc-org/nestjs-query-graphql';
import { AppColorScheme } from 'license-verify';

@ObjectType()
export class CurrentConfiguration {
  @Field(() => String, { nullable: true })
  purchaseCode?: string;
  @Field(() => String, { nullable: true })
  backendMapsAPIKey?: string;
  @Field(() => String, { nullable: true })
  adminPanelAPIKey?: string;
  @Field(() => String, { nullable: true })
  firebaseProjectPrivateKey?: string;
  @Field(() => String, { nullable: true })
  versionNumber?: number;
  @Field(() => String, { nullable: true })
  companyLogo?: string;
  @Field(() => String, { nullable: true })
  companyName?: string;
  @Field(() => AppColorScheme, { nullable: true })
  companyColor?: AppColorScheme;
  @Field(() => AppConfigInfoDTO, { nullable: true })
  taxi?: AppConfigInfoDTO;
  @Field(() => AppConfigInfoDTO, { nullable: true })
  shop?: AppConfigInfoDTO;
  @Field(() => AppConfigInfoDTO, { nullable: true })
  parking?: AppConfigInfoDTO;
  @Field(() => String, { nullable: true })
  mysqlHost?: string;
  @Field(() => Int, { nullable: true })
  mysqlPort?: number;
  @Field(() => String, { nullable: true })
  mysqlUser?: string;
  @Field(() => String, { nullable: true })
  mysqlPassword?: string;
  @Field(() => String, { nullable: true })
  mysqlDatabase?: string;
  @Field(() => String, { nullable: true })
  redisHost?: string;
  @Field(() => Int, { nullable: true })
  redisPort?: number;
  @Field(() => String, { nullable: true })
  redisPassword?: string;
  @Field(() => Int, { nullable: true })
  redisDb?: number;
}

@ObjectType()
export class UploadResult {
  @Field(() => String, { nullable: false })
  url!: string;
}

export enum UpdatePurchaseCodeStatus {
  OK = 'OK',
  INVALID = 'INVALID',
  OVERUSED = 'OVERUSED',
  CLIENT_FOUND = 'CLIENT_FOUND',
}

registerEnumType(UpdatePurchaseCodeStatus, {
  name: 'UpdatePurchaseCodeStatus',
});

@ObjectType()
export class AvaialbeUpgrade {
  @Field(() => String)
  type!: string;
  @Field(() => Float)
  price!: number;
  @Field(() => [String])
  benefits!: string[];
}
@ObjectType()
export class UpdatePurchaseCodeClient {
  @IDField(() => ID)
  id!: number;
  @Field(() => Boolean, { nullable: false })
  enabled!: boolean;
  @Field(() => String, { nullable: false })
  ip!: string;
  @Field(() => Float, { nullable: false })
  port!: number;
  @Field(() => String, { nullable: false })
  token!: string;
  @Field(() => ID)
  purchaseId!: number;
  @Field(() => GraphQLISODateTime, { nullable: false })
  firstVerifiedAt!: Date;
  @Field(() => GraphQLISODateTime, { nullable: false })
  lastVerifiedAt!: Date;
}
@ObjectType('LicenseInformation')
export class LicenseInformationDTO {
  @Field(() => License, { nullable: true })
  license!: License;
  @Field(() => [String], { nullable: true })
  benefits!: string[];
  @Field(() => [String], { nullable: true })
  drawbacks!: string[];
  @Field(() => [AvaialbeUpgrade], { nullable: true })
  availableUpgrades!: AvaialbeUpgrade[];
}
@ObjectType()
export class UpdatePurchaseCodeResult {
  @Field(() => UpdatePurchaseCodeStatus, { nullable: false })
  status!: UpdatePurchaseCodeStatus;
  @Field(() => String, { nullable: true })
  message?: string;
  @Field(() => LicenseInformationDTO, { nullable: true })
  data?: LicenseInformationDTO;
  @Field(() => [UpdatePurchaseCodeClient], { nullable: true })
  clients?: UpdatePurchaseCodeClient[];
}

export enum UpdateConfigStatus {
  OK = 'OK',
  INVALID = 'INVALID',
}

registerEnumType(UpdateConfigStatus, { name: 'UpdateConfigStatus' });

export enum LicenseType {
  Regular = 'Regular',
  Extended = 'Extended',
  Bronze = 'Bronze',
  Silver = 'Silver',
  Gold = 'Gold',
}

registerEnumType(LicenseType, { name: 'LicenseType' });

@ObjectType()
export class UpdateConfigResult {
  @Field(() => UpdateConfigStatus)
  status!: UpdateConfigStatus;
  @Field(() => String, { nullable: true })
  message?: string;
}
