import { Injectable, Logger } from '@nestjs/common';
import {
  ProductEntity,
  ProductOptionEntity,
  ProductVariantEntity,
} from '../entities';
import { CartGroupPricingInput } from './models/cart-group-pricing.input';
import { CartGroupPricingOutput } from './models/cart-group-pricing-output';

type PricingResult = {
  basePrice: number;
  discountedPrice: number;
};

@Injectable()
export class ShopPricingService {
  getProductPricing(input: {
    product: ProductEntity;
    quantity: number;
    variant?: ProductVariantEntity;
    options?: ProductOptionEntity[];
  }): PricingResult {
    const { product, quantity, variant, options = [] } = input;

    let price = variant?.basePrice ?? product.basePrice;

    const optionsTotal = options.reduce((sum, option) => {
      return sum + (option?.price ?? 0);
    }, 0);

    price += optionsTotal;

    const discountedPrice =
      product.discountPercentage > 0
        ? price - (price * product.discountPercentage) / 100
        : price;

    return {
      basePrice: price * quantity,
      discountedPrice: discountedPrice * quantity,
    };
  }

  getProductsPricing(
    items: {
      product: ProductEntity;
      variant?: ProductVariantEntity;
      options?: ProductOptionEntity[];
      quantity: number;
    }[],
  ): PricingResult {
    return items.reduce(
      (acc, item) => {
        const { product, variant, options, quantity } = item;
        const pricing = this.getProductPricing({
          product,
          quantity,
          variant,
          options,
        });
        acc.basePrice += pricing.basePrice;
        acc.discountedPrice += pricing.discountedPrice;
        return acc;
      },
      { basePrice: 0, discountedPrice: 0 },
    );
  }

  getCartGroupPricing(input: CartGroupPricingInput): CartGroupPricingOutput {
    const logger = new Logger(ShopPricingService.name);
    logger.log(input);
    return input.carts.reduce(
      (acc, cart, index) => {
        const productsPricing = this.getProductsPricing(cart.products);
        const deliveryFee = 0;
        const taxAmount = 0;
        const total = productsPricing.discountedPrice + deliveryFee + taxAmount;
        acc.basePrice += productsPricing.basePrice;
        acc.discountedPrice += productsPricing.discountedPrice;
        acc.deliveryFee += deliveryFee;
        acc.taxAmount += taxAmount;
        acc.totalWithDelivery += total;
        acc.totalPrice += total;
        if (index === 0) acc.currency = cart.shop.currency;
        return acc;
      },
      {
        basePrice: 0,
        discountedPrice: 0,
        deliveryFee: 0,
        taxAmount: 0,
        totalWithDelivery: 0,
        totalPrice: 0,
        currency: '',
      },
    );
  }
}
