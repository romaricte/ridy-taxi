import { Module } from '@nestjs/common';
import { ShopPricingService } from './shop-pricing.service';

@Module({
  imports: [],
  providers: [ShopPricingService],
  exports: [ShopPricingService],
})
export class ShopPricingModule {}
