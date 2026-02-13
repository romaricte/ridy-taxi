import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShopEntity } from './shop.entity';
import { ShopCategoryEntity } from './shop-category.entity';

@Entity('shop_subcategory')
export class ShopSubcategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ default: 0 })
  displayPriority: number;

  @ManyToOne(() => ShopCategoryEntity, (category) => category.subcategories)
  category: ShopCategoryEntity;

  @Column()
  categoryId!: number;

  @ManyToMany(() => ShopEntity, (shop) => shop.subcategories)
  shops!: ShopEntity[];
}
