// common/storage/s3.storage.ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { StoragePort } from './storage.port';
import { Readable } from 'stream';

@Injectable()
export class S3Storage implements StoragePort {
  private s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      : undefined,
  }); // region/creds from env/role

  constructor(
    private bucket = process.env.AWS_S3_BUCKET!,
    private cacheControl = process.env.AWS_S3_CACHE_CONTROL ??
      'public, max-age=31536000, immutable',
  ) {}

  async putObject({
    key,
    body,
    contentType,
    cacheControl,
  }: {
    key: string;
    body: Buffer | Readable;
    contentType?: string;
    cacheControl?: string;
  }): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl ?? this.cacheControl,
        // ServerSideEncryption: 'AES256', // or KMS if required
      }),
    );
  }

  publicPathFor(key: string): string {
    // Keep returning /uploads/... so Nginx can 302/proxy to your CDN/S3 as you configure there
    return `/${key}`.replace(/^\/?uploads\//, '/uploads/');
  }
}
