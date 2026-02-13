import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export enum PaymentGatewayType {
  Stripe = 'stripe',
  BrainTree = 'braintree',
  PayPal = 'paypal',
  Paytm = 'paytm',
  Razorpay = 'razorpay',
  Paystack = 'paystack',
  PayU = 'payu',
  Instamojo = 'instamojo',
  Flutterwave = 'flutterwave',
  PayGate = 'paygate',
  MIPS = 'mips',
  MercadoPago = 'mercadopago',
  AmazonPaymentServices = 'amazon',
  MyTMoney = 'mytmoney',
  WayForPay = 'wayforpay',
  MyFatoorah = 'MyFatoorah',
  SberBank = 'SberBank',
  BinancePay = 'BinancePay',
  OpenPix = 'OpenPix',
  PayTR = 'PayTR',
  CustomLink = 'link',
}

export class AddPaytrGateway1706253836308 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.changeColumn(
        'payment_gateway',
        'type',
        new TableColumn({
          name: 'type',
          type: 'enum',
          enum: Object.values(PaymentGatewayType),
        }),
      );
    } catch (error) {
      console.error(error);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
