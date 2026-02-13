import { Field, ObjectType } from '@nestjs/graphql';
import { CurrentConfiguration } from './config.dto';

@ObjectType()
export class ConfigInformation {
  @Field(() => Boolean)
  isValid!: boolean;
  @Field(() => CurrentConfiguration, { nullable: true })
  config?: CurrentConfiguration;
}
