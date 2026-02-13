import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverRechargeTransactionType } from '../entities/enums/driver-recharge-transaction-type.enum';
import { RiderRechargeTransactionType } from '../entities/enums/rider-recharge-transaction-type.enum';
import { TransactionAction } from '../entities/enums/transaction-action.enum';
import { TransactionStatus } from '../entities/enums/transaction-status.enum';
import { GiftCodeEntity } from '../entities/gift-code.entity';
import { GiftBatchEntity } from '../entities/gift-batch.entity';
import { Repository } from 'typeorm';
import { SharedCustomerWalletService } from '../customer-wallet/shared-customer-wallet.service';
import { DriverTransactionEntity, DriverWalletEntity } from '../entities';
import { ForbiddenError } from '@nestjs/apollo';

@Injectable()
export class CommonGiftCardService {
  constructor(
    @InjectRepository(GiftCodeEntity)
    private giftCardRepo: Repository<GiftCodeEntity>,
    @InjectRepository(DriverWalletEntity)
    private driverWalletRepo: Repository<DriverWalletEntity>,
    @InjectRepository(DriverTransactionEntity)
    private driverTransactionRepo: Repository<DriverTransactionEntity>,
    private sharedCustomerWalletService: SharedCustomerWalletService,
  ) {}

  async redeemGiftCard(input: {
    code: string;
    userType: 'rider' | 'driver';
    userId: number;
  }): Promise<GiftBatchEntity> {
    const giftCode = await this.giftCardRepo.findOne({
      where: {
        code: input.code,
      },
      relations: {
        gift: true,
      },
    });
    if (!giftCode) {
      throw new ForbiddenError('Invalid gift code');
    }
    if (giftCode.usedAt != null) {
      throw new ForbiddenError('Gift code already used');
    }
    if (giftCode.gift.expireAt != null && giftCode.gift.expireAt < new Date()) {
      throw new ForbiddenError('Gift code expired');
    }
    giftCode.usedAt = new Date();
    if (input.userType === 'rider') {
      await this.sharedCustomerWalletService.rechargeWallet({
        action: TransactionAction.Recharge,
        status: TransactionStatus.Done,
        riderId: input.userId,
        amount: giftCode.gift.amount,
        currency: giftCode.gift.currency,
        giftCardId: giftCode.id,
        rechargeType: RiderRechargeTransactionType.Gift,
      });
    } else {
      const transaction = this.driverTransactionRepo.create();
      transaction.amount = parseFloat(giftCode.gift.amount.toString());
      transaction.currency = giftCode.gift.currency;
      transaction.driverId = input.userId;
      transaction.action = TransactionAction.Recharge;
      transaction.rechargeType = DriverRechargeTransactionType.Gift;
      transaction.giftCardId = giftCode.id;
      transaction.status = TransactionStatus.Done;
      let wallet = await this.driverWalletRepo.findOneBy({
        driverId: input.userId,
        currency: transaction.currency,
      });

      if (wallet == null) {
        wallet = await this.driverWalletRepo.save({
          balance: transaction.amount,
          currency: transaction.currency,
          driverId: transaction.driverId,
        });
      } else {
        await this.driverWalletRepo.increment(
          {
            id: wallet.id,
          },
          'balance',
          transaction.amount,
        );
      }
      if (transaction.amount != 0) {
        Logger.log(`Saving transaction ${JSON.stringify(transaction)}`);
        this.driverTransactionRepo.save(transaction);
      }
    }
    await this.giftCardRepo.save(giftCode);
    return giftCode.gift;
  }
}
