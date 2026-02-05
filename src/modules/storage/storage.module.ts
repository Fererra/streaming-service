import { Module } from '@nestjs/common';
import { GcsObjectStorage } from './gcs-object-storage.service';
import { OBJECT_STORAGE } from './storage.token';

@Module({
  providers: [{ provide: OBJECT_STORAGE, useClass: GcsObjectStorage }],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
