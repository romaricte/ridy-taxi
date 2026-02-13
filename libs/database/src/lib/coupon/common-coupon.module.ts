import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponEntity } from '../entities/coupon.entity';
import { TaxiOrderEntity } from '../entities/taxi/taxi-order.entity';

import { CommonCouponService } from './common-coupon.service';
import { CommonGiftCardService } from './common-gift-card.service';
import { GiftCodeEntity } from '../entities/gift-code.entity';
import { CustomerEntity } from '../entities/customer.entity';
import { DriverEntity } from '../entities/taxi/driver.entity';
import { RiderWalletEntity } from '../entities/rider-wallet.entity';
import { DriverWalletEntity } from '../entities/taxi/driver-wallet.entity';
import { RiderTransactionEntity } from '../entities/rider-transaction.entity';
import { DriverTransactionEntity } from '../entities/taxi/driver-transaction.entity';
import { SharedCustomerWalletModule } from '../customer-wallet';
import { CampaignCodeEntity, CampaignEntity } from '../entities';

@Module({
  imports: [
    SharedCustomerWalletModule,
    TypeOrmModule.forFeature([
      TaxiOrderEntity,
      CustomerEntity,
      DriverEntity,
      CouponEntity,
      RiderWalletEntity,
      DriverWalletEntity,
      RiderTransactionEntity,
      DriverTransactionEntity,
      CampaignCodeEntity,
      CampaignEntity,
      GiftCodeEntity,
    ]),
  ],
  providers: [CommonCouponService, CommonGiftCardService],
  exports: [CommonCouponService, CommonGiftCardService],
})
export class CommonCouponModule {}
