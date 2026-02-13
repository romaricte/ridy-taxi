import { Readable } from 'stream';

export const STORAGE = Symbol('STORAGE');

export abstract class StoragePort {
  abstract putObject(params: {
    key: string; // e.g. 'uploads/abcd.png'
    body: Buffer | Readable;
    contentType?: string;
    cacheControl?: string;
  }): Promise<void>;

  // For local compatibility, return a local-ish path you already use.
  // When using S3, return `/uploads/<key>` so your Nginx rule stays valid.
  abstract publicPathFor(key: string): string;
}
