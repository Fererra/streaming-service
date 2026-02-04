import { Bucket, Storage } from '@google-cloud/storage';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BucketType,
  ObjectStorage,
  SignedUploadUrlOptions,
} from './object-storage.interface';

@Injectable()
export class GcsObjectStorage implements ObjectStorage {
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

  private resolveBucket(bucket: BucketType): Bucket {
    return bucket === BucketType.PUBLIC
      ? this.publicBucket
      : this.privateBucket;
  }

  async generateSignedUploadUrl(
    options: SignedUploadUrlOptions,
  ): Promise<string> {
    const bucket = this.resolveBucket(options.bucket);

    const urlOptions = {
      version: 'v4' as const,
      action: 'write' as const,
      contentType: options.contentType,
      expires: new Date(Date.now() + options.expiresInMs),
    };

    const [url] = await bucket
      .file(options.storageKey)
      .getSignedUrl(urlOptions);

    return url;
  }

  async exists(key: string, bucket: BucketType): Promise<boolean> {
    const targetBucket = this.resolveBucket(bucket);
    const [exists] = await targetBucket.file(key).exists();

    return exists;
  }

  getPublicUrl(storageKey: string): string {
    return `https://storage.googleapis.com/${this.publicBucket.name}/${storageKey}`;
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    const [url] = await this.privateBucket.file(storageKey).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: new Date(Date.now() + 15 * 60 * 1000),
    });

    return url;
  }

  async delete(key: string, bucket: BucketType): Promise<void> {
    const targetBucket = this.resolveBucket(bucket);
    await targetBucket.file(key).delete({ ignoreNotFound: true });
  }
}
