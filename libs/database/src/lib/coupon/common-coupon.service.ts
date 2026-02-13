import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CouponEntity } from '../entities/coupon.entity';
import { TaxiOrderEntity } from '../entities/taxi/taxi-order.entity';
import { ForbiddenError } from '@nestjs/apollo';
import { Repository } from 'typeorm';
import { CampaignCodeEntity, CampaignEntity } from '../entities';

@Injectable()
export class CommonCouponService {
  constructor(
    @InjectRepository(CouponEntity)
    private couponRepo: Repository<CouponEntity>,
    @InjectRepository(CampaignCodeEntity)
    private campaignCodeRepo: Repository<CampaignCodeEntity>,
    @InjectRepository(TaxiOrderEntity)
    private requestRepo: Repository<TaxiOrderEntity>,
  ) {}

  applyCouponOnPrice(coupon: CouponEntity | undefined, price: number): number {
    if (coupon == null) return price;
    price *= (100.0 - coupon.discountPercent) / 100.0;
    price -= coupon.discountFlat;
    return price;
  }

  async getCouponInfo(input: {
    code: string;
    riderId?: number;
  }): Promise<CouponEntity | undefined> {
    const coupon = await this.couponRepo.findOneBy({ code: input.code });
    if (coupon != null) {
      if (coupon.expireAt == null || coupon.expireAt < new Date()) {
        throw new ForbiddenError('Coupon expired');
      }
      if (input.riderId != null) {
        const requestsWithCoupon = await this.requestRepo.count({
          where: { riderId: input.riderId, couponId: coupon.id },
        });
        if (requestsWithCoupon >= coupon.manyTimesUserCanUse) {
          throw new ForbiddenError('Coupon already used.');
        }
      }
      if (!coupon.isEnabled) {
        throw new ForbiddenError('Coupon is disabled.');
      }
      const timesCouponUsed = await this.requestRepo.count({
        where: { couponId: coupon.id },
      });
      if (timesCouponUsed >= coupon.manyUsersCanUse) {
        throw new ForbiddenError('Coupon usage limit exceeded.');
      }
      return coupon;
    }
    let newCampaign = await this.getNewCampaign(input.code);
    if (newCampaign) {
      return {
        ...newCampaign,
        code: input.code,
        title: newCampaign.name,
        creditGift: 0,
        riders: [],
        orders: [],
      };
    }
    return undefined;
  }

  async checkCoupon(
    code: string,
    riderId?: number,
  ): Promise<CouponEntity | undefined> {
    const coupon = await this.couponRepo.findOneBy({ code });
    if (coupon == null) {
      return undefined;
    }
    if (coupon.expireAt == null || coupon.expireAt < new Date()) {
      throw new ForbiddenError('Coupon expired');
    }
    if (riderId != null) {
      const requestsWithCoupon = await this.requestRepo.count({
        where: { riderId, couponId: coupon.id },
      });
      if (requestsWithCoupon >= coupon.manyTimesUserCanUse) {
        throw new ForbiddenError('Coupon already used.');
      }
    }
    if (!coupon.isEnabled) {
      throw new ForbiddenError('Coupon is disabled.');
    }
    const timesCouponUsed = await this.requestRepo.count({
      where: { couponId: coupon.id },
    });
    if (timesCouponUsed >= coupon.manyUsersCanUse) {
      throw new ForbiddenError('Coupon usage limit exceeded.');
    }
    return coupon;
  }

  async getNewCampaign(code: string): Promise<CampaignEntity | undefined> {
    const campaignCode = await this.campaignCodeRepo.findOne({
      where: {
        code: code,
      },
      relations: {
        campaign: true,
      },
    });
    return campaignCode?.campaign;
  }

  async applyCoupon(
    code: string,
    orderId: number,
    riderId: number,
  ): Promise<TaxiOrderEntity> {
    Logger.log(
      `Applying coupon ${code} for order ${orderId}, rider ${riderId}`,
    );

    const coupon = await this.checkCoupon(code, riderId);
    if (coupon != null) {
      let request = await this.requestRepo.findOneOrFail({
        where: { id: orderId },
        relations: { service: true },
      });
      const finalCost = this.applyCouponOnPrice(
        coupon,
        request.costBest + request.waitMinutes * request.service.perMinuteWait,
      );
      await this.requestRepo.update(request.id, {
        couponId: coupon?.id,
        costAfterCoupon: finalCost,
      });
      Logger.log(
        `Coupon ${code} applied successfully, final cost: ${finalCost}`,
      );

      request = await this.requestRepo.findOneOrFail({
        where: { id: orderId, riderId: riderId },
        relations: { service: true },
      });
      return request;
    }

    const newCampaign = await this.getNewCampaign(code);
    if (newCampaign) {
      Logger.log(`Campaign ${newCampaign.name} found for code ${code}`);

      let request = await this.requestRepo.findOneOrFail({
        where: { id: orderId, riderId: riderId },
        relations: { service: true },
      });
      const finalCost = this.applyCouponOnPrice(
        {
          ...newCampaign,
          code: code,
          title: newCampaign.name,
          creditGift: 0,
          riders: [],
          orders: [],
        },
        request.costBest + request.waitMinutes * request.service.perMinuteWait,
      );
      await this.requestRepo.update(request.id, {
        campaignCodeId: newCampaign?.id,
        costAfterCoupon: finalCost,
      });
      Logger.log(`Campaign applied successfully, final cost: ${finalCost}`);

      request = await this.requestRepo.findOneOrFail({
        where: { id: orderId, riderId: riderId },
        relations: { service: true },
      });
      this.campaignCodeRepo.update(newCampaign!.id, {
        usedAt: new Date(),
        customerId: riderId,
      });
      return request;
    }

    Logger.warn(`No valid coupon or campaign found for code ${code}`);
    return this.requestRepo.findOneOrFail({
      where: { id: orderId, riderId: riderId },
    });
  }
}
