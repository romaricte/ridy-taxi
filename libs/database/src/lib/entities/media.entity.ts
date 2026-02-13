import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AnnouncementEntity } from './announcement.entity';
import { DriverEntity } from './taxi/driver.entity';
import { OperatorEntity } from './operator.entity';
import { PaymentGatewayEntity } from './payment-gateway.entity';
import { CustomerEntity } from './customer.entity';
import { ParkSpotEntity } from './parking/park-spot.entity';
import { PayoutMethodEntity } from './payout-method.entity';
import urlJoin from 'proper-url-join';

@Entity('media')
export class MediaEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('varchar', {
    transformer: {
      to: (value: string) => value, // store unchanged
      from: (value: string) => urlJoin(process.env.CDN_URL, value), // prepend on read
    },
  })
  address!: string;

  @Column('longtext', {
    nullable: true,
  })
  base64?: string;

  @OneToOne(() => DriverEntity, (driver) => driver.media, {
    onDelete: 'SET NULL',
  })
  driver?: DriverEntity;

  @ManyToOne(() => DriverEntity, (driver) => driver.documents, {
    onDelete: 'SET NULL',
  })
  driverDocument?: DriverEntity;

  @Column({ nullable: true })
  driverDocumentId?: number;

  @OneToOne(() => OperatorEntity, (operator) => operator.media, {
    onDelete: 'SET NULL',
  })
  operator?: OperatorEntity;

  @OneToOne(() => AnnouncementEntity, (announcement) => announcement.media, {
    onDelete: 'SET NULL',
  })
  announcement?: AnnouncementEntity;

  @OneToOne(() => CustomerEntity, (rider) => rider.media, {
    onDelete: 'SET NULL',
  })
  rider?: CustomerEntity[];

  @OneToOne(() => PaymentGatewayEntity, (gateway) => gateway.media, {
    onDelete: 'SET NULL',
  })
  paymentGateway?: PaymentGatewayEntity;

  @OneToOne(() => PayoutMethodEntity, (payoutMethod) => payoutMethod.media, {
    onDelete: 'SET NULL',
  })
  payoutMethod?: PayoutMethodEntity;

  @ManyToOne(() => ParkSpotEntity, (parkSpot) => parkSpot.images, {
    onDelete: 'SET NULL',
  })
  parkSpot?: ParkSpotEntity;

  @Column({ nullable: true })
  parkSpotId?: number;

  @ManyToOne(() => DriverEntity, (driver) => driver.uploads, {
    onDelete: 'SET NULL',
  })
  uploadedByDriver?: DriverEntity;

  @Column({ nullable: true })
  uploadedByDriverId?: number;
}
