import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TaxiOrderDriverStatusEntity } from '../entities/taxi/taxi-order-driver-status.entity';
import { Repository } from 'typeorm/repository/Repository';
import { TaxiOrderDriverStatus } from '../entities/taxi/enums/taxi-order-driver-status.enum';
import { Not } from 'typeorm';

@Injectable()
export class DriverAcceptanceTrackerService {
  constructor(
    @InjectRepository(TaxiOrderDriverStatusEntity)
    private readonly taxiOrderDriverStatusRepository: Repository<TaxiOrderDriverStatusEntity>,
  ) {}

  /**
   * @deprecated Use Redis-based driver acceptance tracking instead
   * This method will be removed in a future version
   */
  async orderDispatchedToDrivers(input: {
    orderId: number;
    driverIds: number[];
  }): Promise<void> {
    const { orderId, driverIds } = input;
    const statusEntities = driverIds.map((driverId) => {
      const status = new TaxiOrderDriverStatusEntity();
      status.taxiOrderId = orderId;
      status.driverId = driverId;
      status.status = TaxiOrderDriverStatus.PENDING;
      return status;
    });
    await this.taxiOrderDriverStatusRepository.save(statusEntities);
  }

  /**
   * @deprecated Use Redis-based driver acceptance tracking instead
   * This method will be removed in a future version
   */
  async orderAcceptedByDriver(input: {
    orderId: number;
    driverId: number;
  }): Promise<void> {
    const { orderId, driverId } = input;
    await this.taxiOrderDriverStatusRepository.update(
      { taxiOrderId: orderId, driverId },
      { status: TaxiOrderDriverStatus.ACCEPTED },
    );
    // Mark the rest as TIMEOUT
    await this.taxiOrderDriverStatusRepository.update(
      { taxiOrderId: orderId, driverId: Not(driverId) },
      { status: TaxiOrderDriverStatus.TIMEOUT },
    );
  }

  // async getDriverAcceptanceRate(input: {
  //   driverId: number;
  //   startTimestamp?: Date;
  //   endTimestamp?: Date;
  // }): Promise<number> {
  //   const { driverId, startTimestamp, endTimestamp } = input;
  //   const total = await this.taxiOrderDriverStatusRepository.count({
  //     where: { driverId, status: TaxiOrderDriverStatus.PENDING },
  //   });
  //   const accepted = await this.taxiOrderDriverStatusRepository.count({
  //     where: {
  //       driverId,
  //       status: TaxiOrderDriverStatus.ACCEPTED,
  //       ...(startTimestamp && { createdAt: MoreThanOrEqual(startTimestamp) }),
  //       ...(endTimestamp && { createdAt: LessThanOrEqual(endTimestamp) }),
  //     },
  //   });
  //   return total > 0 ? (accepted / total) * 100 : 0;
  // }
}
