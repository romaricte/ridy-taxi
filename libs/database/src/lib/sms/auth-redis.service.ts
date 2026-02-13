import { ForbiddenError } from '@nestjs/apollo';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { REDIS } from '../redis';

@Injectable()
export class AuthRedisService {
  constructor(@Inject(REDIS) private readonly redisService: RedisClientType) {}

  async createVerificationCode(input: VerifyHash): Promise<{ hash: string }> {
    const hash = Math.random().toString(36).substring(7);
    let pipeline = this.redisService.multi();
    pipeline.hSet(
      `verify:${hash}`,
      'mobileNumber',
      input.mobileNumber.toString(),
    );
    pipeline.hSet(`verify:${hash}`, 'countryIso', input.countryIso || '');
    pipeline.hSet(`verify:${hash}`, 'code', input.code);
    pipeline.expire(`verify:${hash}`, 60 * 3);
    await pipeline.exec();
    return { hash };
  }

  async isVerificationCodeValid(
    hash: string,
    code: string,
  ): Promise<VerifyHash | null> {
    const verifyHash: VerifyHash = (await this.redisService.hGetAll(
      `verify:${hash}`,
    )) as any;
    Logger.log(verifyHash, 'verifyHash');
    if (!verifyHash) throw new ForbiddenError('EXPIRED');
    if (process.env.DEMO_MODE != null || verifyHash.code == code) {
      return verifyHash;
    } else {
      throw new ForbiddenError('INVALID');
    }
  }

  async deleteVerificationCode(hash: string) {
    await this.redisService.del(`verify:${hash}`);
  }
}

export class VerifyHash {
  mobileNumber!: string;
  countryIso?: string;
  code!: string;
}
