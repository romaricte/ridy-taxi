import { Global, Module } from '@nestjs/common';
import { BetterConfigService } from './config.service';

@Global()
@Module({
  providers: [BetterConfigService],
  exports: [BetterConfigService],
})
export class BetterConfigModule {}
