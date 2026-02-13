import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UseInterceptors,
  applyDecorators,
  mixin,
  Type,
  Logger,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import * as path from 'path';
import { Request } from 'express';
import { STORAGE, StoragePort } from './storage.port';

function createUploadImageInterceptor(
  fieldName = 'file',
): Type<NestInterceptor> {
  @Injectable()
  class SharpImageInterceptor implements NestInterceptor {
    private readonly logger = new Logger('SharpImageInterceptor');

    constructor(@Inject(STORAGE) private readonly storage: StoragePort) {}

    private fileInterceptor = new (FileInterceptor(fieldName, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed =
          /\.(jpg|jpeg|png|gif|heic|heif|webp|bmp|tiff|tif|svg|ico|avif|jfif|pjpeg|pjp)$/i;
        if (!file.originalname.match(allowed)) {
          this.logger.warn(
            `File rejected: ${file.originalname} - Only image files are allowed`,
          );
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }))();

    async intercept(context: ExecutionContext, next: CallHandler) {
      const ctx = context.switchToHttp();
      const req = ctx.getRequest<Request>();

      try {
        await this.fileInterceptor.intercept(context, next);

        if (req.file?.buffer) {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join('');
          const filename = `${randomName}.png`;
          const key = path.posix.join('uploads', filename); // normalized key

          // Convert to PNG in memory
          const pngBuffer = await sharp(req.file.buffer).png().toBuffer();

          // Save via selected storage (local or S3)
          await this.storage.putObject({
            key,
            body: pngBuffer,
            contentType: 'image/png',
          });

          // Preserve the old contract so controllers/services don’t change:
          req.file.filename = filename;
          req.file.path = this.storage.publicPathFor(key); // e.g. '/uploads/<filename>'
          req.file.mimetype = 'image/png';
        }

        return next.handle();
      } catch (error: any) {
        this.logger.error(
          `Error processing image upload: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }
  }

  return mixin(SharpImageInterceptor);
}

export function UploadImageInterceptor(fieldName = 'file') {
  return applyDecorators(
    UseInterceptors(createUploadImageInterceptor(fieldName)),
  );
}
