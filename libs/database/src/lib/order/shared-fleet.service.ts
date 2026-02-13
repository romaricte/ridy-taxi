import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FleetTransactionEntity } from '../entities/taxi/fleet-transaction.entity';
import { FleetWalletEntity } from '../entities/taxi/fleet-wallet.entity';
import { Repository } from 'typeorm';
import { Point } from '../interfaces/point';
import { FleetEntity } from '../entities/taxi/fleet.entity';

@Injectable()
export class SharedFleetService {
  constructor(
    @InjectRepository(FleetEntity)
    private fleetRepository: Repository<FleetEntity>,
    @InjectRepository(FleetWalletEntity)
    private fleetWalletRepository: Repository<FleetWalletEntity>,
    @InjectRepository(FleetTransactionEntity)
    private fleetTransactionEntity: Repository<FleetTransactionEntity>,
  ) {}

  async rechargeWallet(
    transaction: Pick<
      FleetTransactionEntity,
      | 'action'
      | 'rechargeType'
      | 'deductType'
      | 'fleetId'
      | 'amount'
      | 'currency'
      | 'requestId'
      | 'driverId'
      | 'operatorId'
      | 'refrenceNumber'
      | 'description'
    >,
  ) {
    let wallet = await this.fleetWalletRepository.findOneBy({
      fleetId: transaction.fleetId,
      currency: transaction.currency,
    });
    if (wallet == null) {
      wallet = await this.fleetWalletRepository.save({
        fleetId: transaction.fleetId,
        balance: transaction.amount,
        currency: transaction.currency,
      });
    } else {
      await this.fleetWalletRepository.update(wallet.id, {
        balance: transaction.amount + wallet.balance,
      });
      wallet.balance += transaction.amount;
    }
    this.fleetTransactionEntity.save(transaction);
    return wallet;
  }

  async getFleetIdsInPoint(point: Point): Promise<number[]> {
    const fleets: { id: number }[] = await this.fleetRepository.query(
      `SELECT id FROM fleet WHERE ST_Within(st_geomfromtext('POINT(? ?)'), fleet.exclusivityAreas)`,
      [point.lng, point.lat],
    );
    return fleets.map((fleet) => fleet.id);
  }

  async getFleetById(id: number): Promise<FleetEntity | null> {
    return this.fleetRepository.findOneBy({ id });
  }

  async getFleetMultiplierInPoint(point: Point): Promise<number> {
    const fleetIds = await this.getFleetIdsInPoint(point);
    if (fleetIds.length === 0) {
      return 1;
    }
    const fleet = await this.getFleetById(fleetIds[0]);
    return fleet?.feeMultiplier ?? 1;
  }
}
