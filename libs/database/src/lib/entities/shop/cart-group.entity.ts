import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RiderAddressEntity } from '../rider-address.entity';
import { DeliveryMethod } from './enums/delivery-method.enum';
import { CartEntity } from './cart.entity';
import { CustomerEntity } from '../customer.entity';

@Entity('cart_group')
export class CartGroupEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ nullable: true })
  createdAt!: Date;

  @ManyToOne(() => CustomerEntity)
  customer?: CustomerEntity;

  @Column()
  customerId!: number;

  @ManyToOne(() => RiderAddressEntity)
  deliveryAddress?: RiderAddressEntity;

  @Column()
  deliveryAddressId!: number;

  @Column('enum', {
    enum: DeliveryMethod,
  })
  deliveryMethod!: DeliveryMethod;

  @Column('float', {
    nullable: true,
    precision: 10,
    scale: 2,
  })
  bathDeliveryMethodDeliveryFee?: number;

  @Column('float', {
    nullable: true,
    precision: 10,
    scale: 2,
  })
  splitDeliveryMethodDeliveryFee?: number;

  @Column('int', {
    nullable: true,
  })
  batchDeliveryDuration?: number;

  @Column('float', {
    precision: 10,
    scale: 2,
  })
  basePrice!: number;

  @Column('float', {
    nullable: true,
    precision: 10,
    scale: 2,
  })
  discountedPrice?: number;

  @Column('float', {
    nullable: true,
    precision: 10,
    scale: 2,
  })
  deliveryFee?: number;

  @Column('float', {
    precision: 10,
    scale: 2,
  })
  taxAmount!: number;

  @Column('float', {
    precision: 10,
    scale: 2,
  })
  totalWithDelivery!: number;

  @Column('varchar')
  currency!: string;

  @OneToMany(() => CartEntity, (cart) => cart.cartGroup)
  carts?: CartEntity[];
}
