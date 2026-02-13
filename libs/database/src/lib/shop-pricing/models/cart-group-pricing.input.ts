import {
  ProductEntity,
  ProductOptionEntity,
  ProductVariantEntity,
  RiderAddressEntity,
  ShopEntity,
} from '@ridy/database';

export interface CartGroupPricingInput {
  carts: {
    shop: ShopEntity;
    products: {
      product: ProductEntity;
      quantity: number;
      variant?: ProductVariantEntity;
      options?: ProductOptionEntity[];
    }[];
  }[];
  deliveryAddress: RiderAddressEntity;
}
