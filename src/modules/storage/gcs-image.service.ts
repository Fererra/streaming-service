import { Bucket, Storage } from '@google-cloud/storage';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ImageStorage,
  InputOptions,
  UploadOptions,
} from './image-storage.interface';
import { randomUUID } from 'crypto';

@Injectable()
export class GcsImageService implements ImageStorage {
  private readonly publicBucket: Bucket;
  private readonly privateBucket: Bucket;

  constructor(private readonly configService: ConfigService) {
    const storage = new Storage();

    this.publicBucket = storage.bucket(
      this.configService.getOrThrow('GCS_PUBLIC_BUCKET_NAME'),
    );

    this.privateBucket = storage.bucket(
      this.configService.getOrThrow('GCS_PRIVATE_BUCKET_NAME'),
    );
  }

  private resolveBucket(isPublic: boolean): Bucket {
    return isPublic ? this.publicBucket : this.privateBucket;
  }

  async upload(
    input: InputOptions,
    options: UploadOptions,
  ): Promise<{ storageKey: string }> {
    const targetBucket = this.resolveBucket(options.isPublic);

    const fileName = `${options.path}/${Date.now()}-${randomUUID()}.${options.extension}`;
    const cloudFile = targetBucket.file(fileName);

    const metadata: any = {
      contentType: input.contentType,
      cacheControl: options.isPublic
        ? 'public, max-age=31536000, immutable'
        : 'private, max-age=3600',
    };

    await cloudFile.save(input.buffer, {
      metadata,
      resumable: false,
    });

    return { storageKey: fileName };
  }

  getPublicUrl(storageKey: string): string {
    return `https://storage.googleapis.com/${this.publicBucket.name}/${storageKey}`;
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    const [url] = await this.privateBucket.file(storageKey).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });

    return url;
  }

  async delete(key: string, isPublic: boolean): Promise<void> {
    const targetBucket = this.resolveBucket(isPublic);
    await targetBucket.file(key).delete({ ignoreNotFound: true });
  }
}
