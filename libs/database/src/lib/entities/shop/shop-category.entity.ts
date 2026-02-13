import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShopCategoryStatus } from './enums/shop-category-status.enum';
import { ShopEntity } from './shop.entity';
import { MediaEntity } from '../media.entity';
import { ShopSubcategoryEntity } from './shop-subcategory.entity';
import { ShopTaxRuleEntity } from './shop-tax-rule.entity';

@Entity('shop_category')
export class ShopCategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @OneToOne(() => MediaEntity)
  @JoinColumn()
  image?: MediaEntity;

  @Column()
  imageId!: number;

  @CreateDateColumn({ nullable: true })
  createdAt!: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @Column('enum', {
    enum: ShopCategoryStatus,
    default: ShopCategoryStatus.Enabled,
  })
  status!: ShopCategoryStatus;

  @Column({ default: 0 })
  displayPriority: number;

  @ManyToMany(() => ShopEntity, (shop) => shop.categories)
  shops!: ShopEntity[];

  @OneToMany(() => ShopSubcategoryEntity, (subcategory) => subcategory.category)
  subcategories: ShopSubcategoryEntity[];

  @ManyToMany(() => ShopTaxRuleEntity, (taxRule) => taxRule.shopCategories)
  taxRules?: ShopTaxRuleEntity[];
}
