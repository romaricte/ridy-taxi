import {
  DynamicModule,
  Global,
  Logger,
  Module,
  Provider,
} from '@nestjs/common';

import { DriverNotificationService } from './driver-notification.service';
import { RiderNotificationService } from './rider-notification.service';
import { getConfig } from 'license-verify';

@Module({})
@Global()
export class FirebaseNotificationModule {
  static async register(): Promise<DynamicModule> {
    let providers: Provider[] = [];

    if (await getConfig(process.env.NODE_ENV ?? 'production')) {
      providers = [DriverNotificationService, RiderNotificationService];
    }
    Logger.log(providers, 'FirebaseNotificationModule.register.providers');
    return {
      module: FirebaseNotificationModule,
      imports: [],
      providers: providers,
      exports: providers,
    };
  }
}
