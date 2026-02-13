import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShopEntity } from './shop.entity';
import { ShopCategoryEntity } from './shop-category.entity';
import { RegionEntity } from '../taxi/region.entity';

export enum ShopTaxRuleAppliesTo {
  Global = 'global',
  Shop = 'shop',
  Category = 'category',
  Region = 'region',
}

@Entity('shop_tax_rule')
export class ShopTaxRuleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  taxRate!: number;

  @Column({
    type: 'enum',
    enum: ShopTaxRuleAppliesTo,
    default: ShopTaxRuleAppliesTo.Global,
  })
  appliesTo: ShopTaxRuleAppliesTo;

  @ManyToMany(() => ShopEntity, { nullable: true })
  @JoinTable()
  shops?: ShopEntity;

  @ManyToMany(() => ShopCategoryEntity, { nullable: true })
  @JoinTable()
  shopCategories?: ShopCategoryEntity;

  @ManyToMany(() => RegionEntity, { nullable: true })
  @JoinTable()
  regions?: RegionEntity[];

  @Column('int', { default: 0 })
  priority?: number;

  @Column({ default: true })
  isActive: boolean;
}
