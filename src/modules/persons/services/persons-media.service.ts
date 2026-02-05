import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OBJECT_STORAGE } from '../../storage/storage.token';
import {
  BucketType,
  type ObjectStorage,
} from '../../storage/object-storage.interface';
import { extension } from 'mime-types';
import { ImageStoragePath } from '../../storage/storage-path.enum';
import { randomUUID } from 'crypto';
import {
  PERSONS_REPOSITORY,
  UPLOAD_INTENTS_REPOSITORY,
} from 'src/database/repositories/tokens/repository.tokens';
import type { IUploadIntentsRepository } from 'src/database/repositories/interfaces/upload-intents-repository.interface';
import type { IPersonsRepository } from 'src/database/repositories/interfaces/persons-repository.interface';
import { IntentStatus } from 'src/modules/storage/intent-status.enum';

@Injectable()
export class PersonsMediaService {
  constructor(
    @Inject(PERSONS_REPOSITORY)
    private readonly personsRepository: IPersonsRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    @Inject(UPLOAD_INTENTS_REPOSITORY)
    private readonly intents: IUploadIntentsRepository,
  ) {}

  async updatePhoto(
    id: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    const isPersonExists = await this.personsRepository.existsById(id);

    if (!isPersonExists) {
      throw new NotFoundException('Person not found');
    }

    const extractedExtension = this.extractExtension(contentType);
    const storageKey = this.generatePhotoKey(extractedExtension);
    const expiresIn = 15 * 60 * 1000;

    await this.intents.createUploadIntent({
      entityType: 'person_photo',
      entityId: id,
      storageKey,
      contentType,
      expiresAt: new Date(Date.now() + expiresIn),
    });

    const uploadUrl = await this.storage.generateSignedUploadUrl({
      bucket: BucketType.PUBLIC,
      storageKey,
      contentType,
      expiresInMs: expiresIn,
    });

    return { uploadUrl, storageKey };
  }

  private extractExtension(contentType: string): string {
    const fileExtension = extension(contentType);

    if (!fileExtension) {
      throw new BadRequestException(
        'Could not determine file extension from content type',
      );
    }

    return fileExtension;
  }

  private generatePhotoKey(extension: string) {
    return `${ImageStoragePath.PERSON_PHOTOS}/${Date.now()}-${randomUUID()}.${extension}`;
  }

  async confirmPhoto(personId: string, storageKey: string): Promise<void> {
    const intent = await this.intents.consumeIntent(
      'person_photo',
      personId,
      storageKey,
      IntentStatus.IN_PROGRESS,
    );

    if (!intent) {
      throw new BadRequestException('No valid upload intent found');
    }

    const fileExists = await this.storage.exists(storageKey, BucketType.PUBLIC);

    if (!fileExists) {
      await this.intents.updateStatus(intent.id, IntentStatus.FAILED);
      throw new BadRequestException('File not found in storage');
    }

    if (intent.expiresAt < new Date()) {
      await Promise.all([
        this.intents.updateStatus(intent.id, IntentStatus.EXPIRED),
        this.storage.delete(storageKey, BucketType.PUBLIC),
      ]);

      throw new BadRequestException('Upload intent expired');
    }

    let oldPhotoKey: string | null = null;

    try {
      oldPhotoKey = await this.personsRepository.swapPhotoPath(
        personId,
        storageKey,
      );
    } catch (error) {
      await Promise.all([
        this.storage.delete(storageKey, BucketType.PUBLIC),
        this.intents.updateStatus(intent.id, IntentStatus.PENDING),
      ]);
      throw error;
    }

    await this.intents.updateStatus(intent.id, IntentStatus.COMPLETED);

    if (oldPhotoKey) {
      await this.storage.delete(oldPhotoKey, BucketType.PUBLIC);
    }
  }
}
