import { Inject, Injectable } from '@nestjs/common';
import { DispatchConfig, DispatchStrategy } from './dto/dispatch-config';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { RedisClientType } from 'redis';
import { REDIS } from '../redis';

@Injectable()
export class BetterConfigService {
  constructor(@Inject(REDIS) private redisService: RedisClientType) {}

  private getDispatchConfigKey() {
    return `config:dispatch:v1`;
  }

  async getDispatchConfig(): Promise<DispatchConfig> {
    const redisKey = this.getDispatchConfigKey();
    const cached = await this.redisService.json.get(redisKey);
    if (cached && process.env.NODE_ENV === 'production')
      return cached as DispatchConfig;
    const dbConfig = await this._getConfigFromJSONFile();
    this.redisService.json.set(redisKey, '$', instanceToPlain(dbConfig));
    this.redisService.expire(redisKey, 86400); // Cache for 1 day
    return dbConfig;
  }

  async _getConfigFromJSONFile(): Promise<DispatchConfig> {
    const configAddress = `${process.cwd()}/config/dispatch-config.json`;
    if (existsSync(configAddress)) {
      const file = await readFile(configAddress, { encoding: 'utf-8' });
      const config = JSON.parse(file);
      return plainToInstance(DispatchConfig, config);
    } else {
      return {
        strategy: DispatchStrategy.Broadcast,
        requestTimeoutSeconds: 3000,
        maxSearchRadiusMeters: 20000,
        scoring: {
          distanceWeight: 1,
          driverRatingWeight: 0.5,
          cancelRateWeight: 0.5,
          idleTimeWeight: 0.5,
          threshold: 1,
          topN: 5,
        },
        broadcastConfig: {
          waveSize: 10,
          waveIntervalSeconds: 30,
          maxWaves: 3,
          radiusIncrementMeters: 1000,
        },
        sequentialConfig: {
          perDriverTimeoutSeconds: 30,
          avoidPreviousCandidates: true,
          driverRetryLimit: 3,
          maxDriversToTest: 10,
        },
        radiusExpansion: {
          enabled: false,
          stepMeters: 100,
          maxSteps: 5,
          intervalSeconds: 10,
        },
      };
    }
  }

  async saveDispatchConfig(dispatchConfig: DispatchConfig) {
    await this.redisService.json.set(
      this.getDispatchConfigKey(),
      '$',
      instanceToPlain(dispatchConfig),
    );
    this.redisService.expire(this.getDispatchConfigKey(), 86400); // Cache for 1 day
    const configAddress = `${process.cwd()}/config/dispatch-config-v1.json`;
    const config = JSON.stringify(dispatchConfig, null, 2);
    await writeFile(configAddress, config, { encoding: 'utf-8' });
  }
}
