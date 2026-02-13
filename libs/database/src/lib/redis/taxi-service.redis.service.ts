import { InjectRepository } from '@nestjs/typeorm';
import { ServiceEntity } from '../entities';
import { In, Repository } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { REDIS } from './redis-token';
import { RedisClientType } from 'redis';

@Injectable()
export class TaxiServiceRedisService {
  constructor(
    @InjectRepository(ServiceEntity)
    private taxiServiceRepository: Repository<ServiceEntity>,
    @Inject(REDIS) private redisService: RedisClientType,
  ) {}

  async getTaxiServicesByIds(
    ids: string[],
  ): Promise<TaxiServiceRedisSnapshot[]> {
    const pipe = this.redisService.multi();
    for (const id of ids) {
      pipe.json.get(`taxi_service:${id}`);
    }
    const results = await pipe.exec(); // [ [err, data], ... ]

    const snapshots: TaxiServiceRedisSnapshot[] = [];
    const missing: string[] = [];

    results.forEach((r, i) => {
      const err = r[0] as Error | null;
      const data = r[1] as string | null;
      if (err) {
        // log if you want
        missing.push(ids[i]);
        return;
      }
      if (!data) {
        missing.push(ids[i]);
        return;
      }
      try {
        const parsed = JSON.parse(data)[0];
        if (parsed)
          snapshots.push(plainToInstance(TaxiServiceRedisSnapshot, parsed));
        else missing.push(ids[i]);
      } catch {
        missing.push(ids[i]);
      }
    });

    // Backfill misses from DB (optional but recommended)
    if (missing.length) {
      const dbServices = await this.taxiServiceRepository.find({
        where: { id: In(missing) },
        relations: { media: true, regions: true },
      });
      const cachePipe = this.redisService.multi();
      for (const s of dbServices) {
        const snap: TaxiServiceRedisSnapshot = {
          id: s.id,
          name: s.name,
          imageAddress: s.media?.address,
          waitCostPerMinute: s.perMinuteWait ?? 0,
          regionIds: s.regions.map((r) => r.id.toString()),
          cancelationTotalFee: s.cancellationTotalFee,
          platformShareFlat: s.providerShareFlat,
          platformSharePercent: s.providerSharePercent,
          cancelationFeeDriverShare: s.cancellationDriverShare,
        };
        cachePipe.json.set(`taxi_service:${s.id}`, '$', instanceToPlain(snap));
        cachePipe.expire(`taxi_service:${s.id}`, 3600);
        snapshots.push(snap);
      }
      await cachePipe.exec();
    }

    return snapshots;
  }

  async getTaxiServiceById(
    id: string,
  ): Promise<TaxiServiceRedisSnapshot | null> {
    const cached = await this.redisService.json.get(`taxi_service:${id}`);
    if (cached) {
      try {
        return plainToInstance(TaxiServiceRedisSnapshot, cached);
      } catch {
        /* fallthrough */
      }
    }

    const service = await this.taxiServiceRepository.findOne({
      where: { id: parseInt(id) },
      relations: { media: true, regions: true },
    });
    if (!service) return null;

    const snapshot: TaxiServiceRedisSnapshot = {
      id: service.id,
      name: service.name,
      imageAddress: service.media?.address || '',
      waitCostPerMinute: service.perMinuteWait ?? 0,
      regionIds: service.regions.map((r) => r.id.toString()),
      cancelationTotalFee: service.cancellationTotalFee,
      platformShareFlat: service.providerShareFlat,
      platformSharePercent: service.providerSharePercent,
      cancelationFeeDriverShare: service.cancellationDriverShare,
    };

    const pipe = this.redisService.multi();
    pipe.json.set(`taxi_service:${id}`, '$', instanceToPlain(snapshot));
    pipe.expire(`taxi_service:${id}`, 3600);
    await pipe.exec();

    return snapshot;
  }

  async getAllTaxiServices(): Promise<TaxiServiceRedisSnapshot[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const res = await this.redisService.scan(cursor, {
        MATCH: 'taxi_service:*',
        COUNT: 100,
      });
      cursor = res[0];
      keys.push(...res[1]);
    } while (cursor !== '0');

    if (keys.length === 0) return [];

    const pipe = this.redisService.multi();
    for (const k of keys) pipe.json.get(k);
    const rows = await pipe.exec();

    const services: TaxiServiceRedisSnapshot[] = [];
    for (const row of rows) {
      if (!row) continue;
      try {
        if (row) services.push(plainToInstance(TaxiServiceRedisSnapshot, row));
      } catch {
        /* ignore bad rows */
      }
    }
    return services;
  }
}

export class TaxiServiceRedisSnapshot {
  id: number;
  name: string;
  imageAddress: string;
  waitCostPerMinute: number;
  cancelationTotalFee: number;
  cancelationFeeDriverShare: number;
  platformSharePercent: number;
  platformShareFlat: number;
  regionIds: string[];
}
