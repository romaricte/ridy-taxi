export class CartGroupPricingOutput {
  basePrice!: number;
  discountedPrice!: number;
  taxAmount!: number;
  totalPrice!: number;
  deliveryFee!: number;
  totalWithDelivery!: number;
  currency!: string;
}
