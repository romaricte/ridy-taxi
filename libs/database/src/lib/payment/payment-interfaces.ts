import { PaymentStatus } from '../entities/enums/payment-status.enum';

export class IntentResult {
  status: 'success' | 'redirect' | 'failed' | 'authorized';
  url?: string;
  error?: string;
}

export class PaymentPayoutData {
  platformFee!: number;
  destinationAccount!: string;
}
export class ChargeSavedPaymentMethodBody {
  userId!: string;
  userType!: string;
  savedPaymentMethodId!: string;
  amount!: number;
  currency!: string;
  orderNumber?: string;
  payoutData?: PaymentPayoutData | null;
  returnUrl!: string;
  captureImmediately!: boolean;
}

export class DecryptedPaymentResult {
  status: PaymentStatus;
  userType: string;
  userId: number;
  orderId?: number;
  timestamp: number;
  gatewayId: number;
  transactionNumber: string;
  amount: number;
  currency: string;
}

export class GetPaymentLinkBody {
  userId: string;
  userType: string;
  paymentGatewayId: number;
  amount: string;
  currency: string;
  returnUrl: string;
  payoutData: PaymentPayoutData | null;
  shouldPreauth: '1' | '0';
  orderNumber: string | undefined;
}

export class SetupSavedPaymentMethodDecryptedBody {
  gatewayId: string;
  userType: 'rider' | 'driver' | 'shop' | 'parking';
  userId: string;
  returnUrl: string;
  currency: string;
}

export class SetupPayoutMethodBody {
  payoutMethodId: number;
  userType: 'driver' | 'shop' | 'customer';
  driverId: number;
  returnUrl: string;
}
