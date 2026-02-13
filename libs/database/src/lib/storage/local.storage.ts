// common/storage/local.storage.ts
import { Injectable } from '@nestjs/common';
import { StoragePort } from './storage.port';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Readable } from 'stream';

@Injectable()
export class LocalStorage implements StoragePort {
  constructor(private root = process.env.LOCAL_ROOT ?? '') {}

  async putObject({
    key,
    body,
  }: {
    key: string;
    body: Buffer | Readable;
  }): Promise<void> {
    const full = path.join(this.root, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    if (Buffer.isBuffer(body)) {
      await fs.writeFile(full, body);
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(chunk as Buffer);
      await fs.writeFile(full, Buffer.concat(chunks));
    }
  }

  publicPathFor(key: string): string {
    // keep your existing convention:
    // DB stores '/uploads/<filename>'; Nginx serves 'alias ./uploads;'
    return `/uploads/${key.replace(/^uploads\//, '')}`;
  }
}
