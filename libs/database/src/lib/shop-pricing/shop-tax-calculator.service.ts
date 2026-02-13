import { InjectRepository } from '@nestjs/typeorm';
import {
  ShopTaxRuleAppliesTo,
  ShopTaxRuleEntity,
} from '../entities/shop/shop-tax-rule.entity';
import { Brackets, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ShopTaxCalculatorService {
  constructor(
    @InjectRepository(ShopTaxRuleEntity)
    private readonly shopTaxRuleRepository: Repository<ShopTaxRuleEntity>,
  ) {}

  async findApplicableTaxRules(
    shopId?: number,
    categoryId?: number,
  ): Promise<ShopTaxRuleEntity[]> {
    const qb = this.shopTaxRuleRepository
      .createQueryBuilder('rule')
      .leftJoin('rule.shops', 'shop')
      .leftJoin('rule.shopCategories', 'category')
      .where('rule.isActive = :isActive', { isActive: true });

    // Always include global rules
    qb.andWhere(
      new Brackets((qb) => {
        qb.where('rule.appliesTo = :global', {
          global: ShopTaxRuleAppliesTo.Global,
        });

        if (shopId != null) {
          qb.orWhere(`(rule.appliesTo = :shopType AND shop.id = :shopId)`, {
            shopType: ShopTaxRuleAppliesTo.Shop,
            shopId,
          });
        }

        if (categoryId != null) {
          qb.orWhere(
            `(rule.appliesTo = :categoryType AND category.id = :categoryId)`,
            {
              categoryType: ShopTaxRuleAppliesTo.Category,
              categoryId,
            },
          );
        }
      }),
    );

    return qb.getMany();
  }
}
