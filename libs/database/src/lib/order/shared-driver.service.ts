import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { DriverTransactionEntity } from '../entities/taxi/driver-transaction.entity';
import { DriverWalletEntity } from '../entities/taxi/driver-wallet.entity';
import { DriverEntity } from '../entities/taxi/driver.entity';
import { DriverStatus } from '../entities/enums/driver-status.enum';
import {
  DriverDeductTransactionType,
  PayoutAccountEntity,
  TransactionAction,
  TransactionStatus,
} from '../entities';
import Stripe from 'stripe';

@Injectable()
export class SharedDriverService {
  constructor(
    @InjectRepository(DriverEntity)
    public driverRepo: Repository<DriverEntity>,
    @InjectRepository(DriverWalletEntity)
    private driverWalletRepo: Repository<DriverWalletEntity>,
    @InjectRepository(DriverTransactionEntity)
    private driverTransactionRepo: Repository<DriverTransactionEntity>,
    @InjectRepository(PayoutAccountEntity)
    private payoutAccountRepository: Repository<PayoutAccountEntity>,
    @InjectRepository(DriverWalletEntity)
    private driverWalletRepository: Repository<DriverWalletEntity>,
  ) {}

  async findById(id: number): Promise<DriverEntity> {
    return this.driverRepo.findOneOrFail({
      where: { id },
      relations: {
        enabledServices: {
          service: true,
        }, // We are using this relation in many places more specifically to find out if driver can do a service or not
      },
      withDeleted: true,
    });
  }

  async getDriverDefaultPayoutAccount(
    driverId: number,
  ): Promise<PayoutAccountEntity | undefined> {
    const payoutAccounts = await this.driverRepo.findOne({
      where: { id: driverId },
      relations: {
        payoutAccounts: {
          payoutMethod: true,
        },
      },
    });
    return payoutAccounts?.payoutAccounts!.find((method) => method.isDefault);
  }

  async updateDriverStatus(driverId: number, status: DriverStatus) {
    return this.driverRepo.update(driverId, { status });
  }

  /**
   * @deprecated Use Redis-based driver service lookup instead for better performance
   */
  async getOnlineDriversWithServiceId(
    driverIds: number[],
    serviceId: number,
    fleetIds: number[] = [],
  ) {
    Logger.warn(
      'getOnlineDriversWithServiceId is deprecated. Use Redis-based driver service lookup instead.',
    );
    Logger.log(serviceId, 'SharedDriverService.serviceId');
    Logger.log(driverIds, 'SharedDriverService.driverIds');
    Logger.log(fleetIds, 'SharedDriverService.fleetIds');
    let driversWithService: DriverEntity[];
    if (fleetIds.length > 0) {
      driversWithService = await this.driverRepo.find({
        where: {
          id: In(driverIds),
          status: DriverStatus.Online,
          fleetId: In(fleetIds),
        },
        relations: {
          enabledServices: {
            service: true,
          },
        },
      });
    } else {
      driversWithService = await this.driverRepo.find({
        where: {
          id: In(driverIds),
          status: DriverStatus.Online,
        },
        relations: {
          enabledServices: {
            service: true,
          },
        },
      });
    }
    return driversWithService.filter((x) =>
      x.enabledServices?.map((y) => y.service?.id).includes(serviceId),
    );
  }

  async canDriverDoServiceAndFleet(
    driverId: number,
    serviceId: number,
    fleetIds: number[] = [],
  ): Promise<boolean> {
    return (
      (
        await this.getOnlineDriversWithServiceId(
          [driverId],
          serviceId,
          fleetIds,
        )
      ).length > 0
    );
  }

  async rechargeWallet(
    transaction: Pick<
      DriverTransactionEntity,
      | 'status'
      | 'action'
      | 'rechargeType'
      | 'deductType'
      | 'amount'
      | 'currency'
      | 'driverId'
      | 'requestId'
      | 'operatorId'
      | 'paymentGatewayId'
      | 'refrenceNumber'
      | 'description'
      | 'giftCardId'
    >,
  ) {
    let wallet = await this.driverWalletRepo.findOneBy({
      driverId: transaction.driverId,
      currency: transaction.currency,
    });
    transaction.amount = parseFloat(transaction.amount.toString());
    if (wallet == null) {
      wallet = await this.driverWalletRepo.save({
        balance: transaction.amount,
        currency: transaction.currency,
        driverId: transaction.driverId,
      });
    } else {
      await this.driverWalletRepo.update(wallet.id, {
        balance:
          parseFloat(transaction.amount.toString()) +
          parseFloat(wallet.balance.toString()),
      });
      wallet.balance += transaction.amount;
    }
    if (transaction.amount != 0) {
      Logger.log(`Saving transaction ${JSON.stringify(transaction)}`);
      this.driverTransactionRepo.save(transaction);
    }
    return wallet;
  }

  async setRating(driverId: number, rating: number, totalRatingCount: number) {
    return this.driverRepo.update(driverId, {
      rating: rating,
      reviewCount: totalRatingCount,
    });
  }

  async deleteById(id: number): Promise<DriverEntity> {
    const user = await this.findById(id);
    await this.driverRepo.softDelete(id);
    return user;
  }
  async payout(input: {
    driverId: number;
    amount: number;
    currency: string;
    requestId: number;
    action: TransactionAction;
    deductType: DriverDeductTransactionType;
    payoutAccountId: number;
  }): Promise<{
    status: TransactionStatus;
    transactionNumber?: string;
  }> {
    const payoutAccount = await this.payoutAccountRepository.findOneOrFail({
      where: { id: input.payoutAccountId },
      relations: {
        payoutMethod: true,
      },
    });
    const instance = new Stripe(payoutAccount.payoutMethod!.privateKey!, {
      apiVersion: '2025-07-30.basil',
    });
    try {
      const stripeTransaction = await instance.transfers.create({
        amount: Math.floor(input.amount * 100),
        currency: input.currency,
        destination: payoutAccount.token!,
        description: 'Payout for trip ' + input.requestId,
      });
      await this.driverWalletRepository.decrement(
        {
          driverId: input.driverId,
          currency: input.currency,
        },
        'balance',
        input.amount,
      );
      const transaction = this.driverTransactionRepo.create();
      transaction.status = TransactionStatus.Done;
      transaction.action = input.action;
      transaction.deductType = input.deductType;
      transaction.amount = input.amount;
      transaction.currency = input.currency;
      transaction.driverId = input.driverId;
      transaction.requestId = input.requestId;
      transaction.payoutAccountId = input.payoutAccountId;
      transaction.payoutMethodId = payoutAccount.payoutMethod?.id;
      transaction.refrenceNumber = stripeTransaction.id;
      await this.driverTransactionRepo.save(transaction);
      return {
        status: TransactionStatus.Done,
        transactionNumber: stripeTransaction.id,
      };
    } catch (error) {
      Logger.error(
        `Error while processing payout for driver ${input.driverId}: ${error.message}`,
      );
      return {
        status: TransactionStatus.Rejected,
      };
    }
  }
}
