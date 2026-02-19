import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import type { IMoviesRepository } from '../../../database/repositories/interfaces/movies-repository.interface';
import {
  MOVIES_REPOSITORY,
  UPLOAD_INTENTS_REPOSITORY,
} from '../../../database/repositories/tokens/repository.tokens';
import { OBJECT_STORAGE } from '../../storage/storage.token';
import type { ObjectStorage } from '../../storage/object-storage.interface';
import { BucketType } from '../../storage/object-storage.interface';
import {
  ImageStoragePath,
  VideoStoragePath,
} from '../../storage/storage-path.enum';
import { extension } from 'mime-types';
import { randomUUID } from 'crypto';
import type { IUploadIntentsRepository } from '../../../database/repositories/interfaces/upload-intents-repository.interface';
import { IntentStatus } from '../../../modules/storage/intent-status.enum';

const DEFAULT_POSTER_KEY = 'defaults/movie-poster-default.png';

type MediaType = 'poster' | 'trailer' | 'video';

interface MediaConfig {
  entityType: string;
  bucket: BucketType;
  expiresInMs: number;
  generateKey: (movieId: string, extension: string) => string;
  swapPath: (movieId: string, storageKey: string) => Promise<string | null>;
}

export class MoviesMediaService {
  private readonly mediaConfigs: Record<MediaType, MediaConfig> = {
    poster: {
      entityType: 'movie_poster',
      bucket: BucketType.PUBLIC,
      expiresInMs: 15 * 60 * 1000,
      generateKey: (_movieId, extension) =>
        `${ImageStoragePath.MOVIE_POSTERS}/${Date.now()}-${randomUUID()}.${extension}`,
      swapPath: (movieId, storageKey) =>
        this.moviesRepository.swapPosterPath(movieId, storageKey),
    },
    trailer: {
      entityType: 'movie_trailer',
      bucket: BucketType.PUBLIC,
      expiresInMs: 60 * 60 * 1000,
      generateKey: (movieId, extension) =>
        `${VideoStoragePath.MOVIES}/${movieId}/trailer.${extension}`,
      swapPath: (movieId, storageKey) =>
        this.moviesRepository.swapTrailerPath(movieId, storageKey),
    },
    video: {
      entityType: 'movie_video',
      bucket: BucketType.PRIVATE,
      expiresInMs: 60 * 60 * 1000,
      generateKey: (movieId, extension) =>
        `${VideoStoragePath.MOVIES}/${movieId}/video.${extension}`,
      swapPath: (movieId, storageKey) =>
        this.moviesRepository.swapVideoPath(movieId, storageKey),
    },
  };

  constructor(
    @Inject(MOVIES_REPOSITORY)
    private readonly moviesRepository: IMoviesRepository,
    @Inject(OBJECT_STORAGE)
    private readonly storage: ObjectStorage,
    @Inject(UPLOAD_INTENTS_REPOSITORY)
    private readonly intents: IUploadIntentsRepository,
  ) {}

  private async createUploadIntent(
    movieId: string,
    contentType: string,
    mediaType: MediaType,
  ) {
    const movieExists = await this.moviesRepository.existsBy({ id: movieId });

    if (!movieExists) {
      throw new NotFoundException('Movie not found');
    }

    const config = this.mediaConfigs[mediaType];
    const extension = this.extractExtension(contentType);
    const storageKey = config.generateKey(movieId, extension);

    await this.intents.createUploadIntent({
      entityType: config.entityType,
      entityId: movieId,
      storageKey,
      contentType,
      expiresAt: new Date(Date.now() + config.expiresInMs),
    });

    const uploadUrl = await this.storage.generateSignedUploadUrl({
      bucket: config.bucket,
      storageKey,
      contentType,
      expiresInMs: config.expiresInMs,
    });

    return { uploadUrl, storageKey };
  }

  private async confirmUpload(
    movieId: string,
    storageKey: string,
    mediaType: MediaType,
  ): Promise<void> {
    const config = this.mediaConfigs[mediaType];

    const intent = await this.intents.consumeIntent(
      config.entityType,
      movieId,
      storageKey,
      IntentStatus.IN_PROGRESS,
    );

    if (!intent) {
      throw new BadRequestException('No valid upload intent found');
    }

    const fileExists = await this.storage.exists(storageKey, config.bucket);

    if (!fileExists) {
      await this.intents.updateStatus(intent.id, IntentStatus.FAILED);
      throw new BadRequestException('File not found in storage');
    }

    if (intent.expiresAt < new Date()) {
      await Promise.all([
        this.intents.updateStatus(intent.id, IntentStatus.EXPIRED),
        this.storage.delete(storageKey, config.bucket),
      ]);
      throw new BadRequestException('Upload intent expired');
    }

    let oldMediaKey: string | null = null;

    try {
      oldMediaKey = await config.swapPath(movieId, storageKey);
    } catch (error) {
      await Promise.all([
        this.storage.delete(storageKey, config.bucket),
        this.intents.updateStatus(intent.id, IntentStatus.PENDING),
      ]);
      throw error;
    }

    await this.intents.updateStatus(intent.id, IntentStatus.COMPLETED);

    if (oldMediaKey) {
      await this.storage.delete(oldMediaKey, config.bucket);
    }
  }

  async updatePoster(movieId: string, contentType: string) {
    return this.createUploadIntent(movieId, contentType, 'poster');
  }

  async confirmPoster(movieId: string, storageKey: string): Promise<void> {
    return this.confirmUpload(movieId, storageKey, 'poster');
  }

  async uploadTrailer(movieId: string, contentType: string) {
    return this.createUploadIntent(movieId, contentType, 'trailer');
  }

  async confirmTrailer(movieId: string, storageKey: string): Promise<void> {
    return this.confirmUpload(movieId, storageKey, 'trailer');
  }

  async uploadVideo(movieId: string, contentType: string) {
    return this.createUploadIntent(movieId, contentType, 'video');
  }

  async confirmVideo(movieId: string, storageKey: string): Promise<void> {
    return this.confirmUpload(movieId, storageKey, 'video');
  }

  resolvePosterUrl(posterPath?: string | null) {
    const key = posterPath ?? DEFAULT_POSTER_KEY;
    return this.storage.getPublicUrl(key);
  }

  resolveTrailerUrl(trailerPath: string | null) {
    if (!trailerPath) {
      return null;
    }

    return this.storage.getPublicUrl(trailerPath);
  }

  resolveVideoUrl(videoPath: string | null) {
    if (!videoPath) {
      return null;
    }

    return this.storage.getSignedUrl(videoPath, 4 * 60 * 60 * 1000);
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
}
