// app.module.ts (or a dedicated StorageModule)
import { Module, Global } from '@nestjs/common';
import { STORAGE, StoragePort } from './storage.port';
import { LocalStorage } from './local.storage';
import { S3Storage } from './s3.storage';

const storageProvider = {
  provide: STORAGE,
  useFactory: (): StoragePort => {
    return (process.env.STORAGE_DRIVER ?? 'local').toLowerCase() === 's3'
      ? new S3Storage()
      : new LocalStorage();
  },
};

@Global()
@Module({
  providers: [storageProvider],
  exports: [storageProvider],
})
export class StorageModule {}
