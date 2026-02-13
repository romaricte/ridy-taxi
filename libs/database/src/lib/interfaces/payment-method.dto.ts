import {
  Field,
  ID,
  InputType,
  InterfaceType,
  ObjectType,
} from '@nestjs/graphql';
import { GatewayLinkMethod, PaymentMode, ProviderBrand } from '../entities';

@InputType('PaymentMethodInput')
export class PaymentMethodInput {
  @Field(() => PaymentMode)
  mode: PaymentMode;
  @Field(() => ID, { nullable: true })
  id?: number;
}

@InterfaceType('PaymentMethodBase', {
  resolveType: (value) => {
    if (value.mode === PaymentMode.Cash) return CashPaymentMethod;
    if (value.mode === PaymentMode.Wallet) return WalletPaymentMethod;
    if (value.mode === PaymentMode.SavedPaymentMethod) return SavedAccount;
    if (value.mode === PaymentMode.PaymentGateway) return OnlinePaymentMethod;
    return null;
  },
})
export abstract class PaymentMethodBase {
  @Field(() => PaymentMode)
  mode: PaymentMode;
  @Field(() => ID, { nullable: true })
  id?: number;
  name?: string;
  imageUrl?: string;
  providerBrand?: ProviderBrand;
  isDefault?: boolean;
  linkMethod?: GatewayLinkMethod;
}

@ObjectType('CashPaymentMethod', { implements: [PaymentMethodBase] })
export class CashPaymentMethod implements PaymentMethodBase {
  @Field(() => PaymentMode)
  mode: PaymentMode.Cash;
}

@ObjectType('WalletPaymentMethod', { implements: [PaymentMethodBase] })
export class WalletPaymentMethod implements PaymentMethodBase {
  @Field(() => PaymentMode)
  mode: PaymentMode.Wallet;
}

@ObjectType('SavedAccount', { implements: [PaymentMethodBase] })
export class SavedAccount implements PaymentMethodBase {
  @Field(() => PaymentMode)
  mode: PaymentMode.SavedPaymentMethod;
  @Field(() => ID)
  id: number;
  @Field(() => String)
  name: string;
  @Field(() => ProviderBrand, { nullable: true })
  providerBrand?: ProviderBrand;
  @Field(() => Boolean)
  isDefault: boolean;
}

@ObjectType('OnlinePaymentMethod', { implements: [PaymentMethodBase] })
export class OnlinePaymentMethod implements PaymentMethodBase {
  @Field(() => PaymentMode)
  mode: PaymentMode.PaymentGateway;
  @Field(() => ID)
  id: number;
  @Field(() => String)
  name: string;
  @Field(() => String, { nullable: true })
  imageUrl?: string;
  @Field(() => GatewayLinkMethod)
  linkMethod: GatewayLinkMethod;
}
