import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaxiOrderEntity } from './taxi-order.entity';
import { DriverEntity } from './driver.entity';
import { TaxiOrderDriverStatus } from './enums/taxi-order-driver-status.enum';

@Entity('taxi_order_driver_status')
export class TaxiOrderDriverStatusEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TaxiOrderEntity)
  taxiOrder!: TaxiOrderEntity;

  @Column()
  taxiOrderId!: number;

  @ManyToOne(() => DriverEntity, (driver) => driver.taxiOrderDriverStatuses)
  driver!: DriverEntity;

  @Column()
  driverId!: number;

  @Column('enum', {
    enum: TaxiOrderDriverStatus,
    default: TaxiOrderDriverStatus.PENDING,
  })
  status!: TaxiOrderDriverStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({
    nullable: true,
  })
  responseAt?: Date;
}
