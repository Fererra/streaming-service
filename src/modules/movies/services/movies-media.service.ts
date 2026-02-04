import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import type { IMoviesRepository } from 'src/database/repositories/interfaces/movies-repository.interface';
import {
  MOVIES_REPOSITORY,
  UPLOAD_INTENTS_REPOSITORY,
} from 'src/database/repositories/tokens/repository.tokens';
import { OBJECT_STORAGE } from '../../storage/storage.token';
import type { ObjectStorage } from '../../storage/object-storage.interface';
import { BucketType } from '../../storage/object-storage.interface';
import { ImageStoragePath } from '../../storage/storage-path.enum';
import { extension } from 'mime-types';
import { randomUUID } from 'crypto';
import type { IUploadIntentsRepository } from 'src/database/repositories/interfaces/upload-intents-repository.interface';
import { IntentStatus } from 'src/modules/storage/intent-status.enum';

export class MoviesMediaService {
  constructor(
    @Inject(MOVIES_REPOSITORY)
    private readonly moviesRepository: IMoviesRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    @Inject(UPLOAD_INTENTS_REPOSITORY)
    private readonly intents: IUploadIntentsRepository,
  ) {}

  async updatePoster(id: string, contentType: string) {
    const movie = await this.moviesRepository.existsBy({ id });

    if (!movie) {
      throw new NotFoundException(`Movie not found`);
    }

    const extractedExtension = this.extractExtension(contentType);
    const storageKey = this.generatePosterKey(extractedExtension);
    const expiresIn = 15 * 60 * 1000;

    await this.intents.createUploadIntent({
      entityType: 'movie_poster',
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

  private generatePosterKey(extension: string) {
    return `${ImageStoragePath.MOVIE_POSTERS}/${Date.now()}-${randomUUID()}.${extension}`;
  }

  async confirmPoster(movieId: string, storageKey: string): Promise<void> {
    const intent = await this.intents.consumeIntent(
      'movie_poster',
      movieId,
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

    let oldPosterKey: string | null = null;

    try {
      oldPosterKey = await this.moviesRepository.swapPosterPath(
        movieId,
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

    if (oldPosterKey) {
      await this.storage.delete(oldPosterKey, BucketType.PUBLIC);
    }
  }
}
