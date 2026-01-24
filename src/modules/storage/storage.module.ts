import { Module } from '@nestjs/common';
import { GcsImageService } from './gcs-image.service';
import { IMAGE_STORAGE } from './storage.token';

@Module({
  providers: [{ provide: IMAGE_STORAGE, useClass: GcsImageService }],
  exports: [IMAGE_STORAGE],
})
export class StorageModule {}
