import { ImageStoragePath } from './storage-path.enum';

export interface InputOptions {
  buffer: Buffer;
  contentType: string;
}

export interface UploadOptions {
  path: ImageStoragePath;
  extension: string;
  isPublic: boolean;
}

export interface ImageStorage {
  upload(
    input: InputOptions,
    options: UploadOptions,
  ): Promise<{ storageKey: string }>;
  getPublicUrl(storageKey: string): string;
  getSignedUrl(storageKey: string): Promise<string>;
  delete(key: string, isPublic: boolean): Promise<void>;
}
