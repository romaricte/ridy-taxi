import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { AppColorScheme } from 'license-verify';

@InputType('AppConfigInfoInput')
@ObjectType('AppConfigInfo')
export class AppConfigInfoDTO {
  @Field(() => String, { nullable: true })
  logo?: string;
  @Field(() => String, { nullable: true })
  name!: string;
  @Field(() => AppColorScheme, { nullable: true })
  color?: AppColorScheme;
}

registerEnumType(AppColorScheme, {
  name: 'AppColorScheme',
});
