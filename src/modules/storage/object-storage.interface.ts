export enum BucketType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export interface SignedUploadUrlOptions {
  bucket: BucketType;
  storageKey: string;
  contentType: string;
  expiresInMs: number;
}

export interface ObjectStorage {
  generateSignedUploadUrl(params: SignedUploadUrlOptions): Promise<string>;
  exists(key: string, bucket: BucketType): Promise<boolean>;
  getPublicUrl(storageKey: string): string;
  getSignedUrl(storageKey: string): Promise<string>;
  delete(key: string, bucket: BucketType): Promise<void>;
}
