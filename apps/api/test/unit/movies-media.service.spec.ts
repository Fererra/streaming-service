import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MoviesMediaService } from '../../src/modules/movies/services/movies-media.service';
import {
  MOVIES_REPOSITORY,
  UPLOAD_INTENTS_REPOSITORY,
} from '../../src/database/repositories/tokens/repository.tokens';
import { OBJECT_STORAGE } from '../../src/modules/storage/storage.token';
import { BucketType } from '../../src/modules/storage/object-storage.interface';
import { IntentStatus } from '../../src/modules/storage/intent-status.enum';

describe('MoviesMediaService', () => {
  let service: MoviesMediaService;

  const moviesRepositoryMock = {
    existsBy: jest.fn(),
    swapPosterPath: jest.fn(),
    swapTrailerPath: jest.fn(),
    swapVideoPath: jest.fn(),
  };

  const storageMock = {
    generateSignedUploadUrl: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  const intentsMock = {
    createUploadIntent: jest.fn(),
    consumeIntent: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesMediaService,
        { provide: MOVIES_REPOSITORY, useValue: moviesRepositoryMock },
        { provide: OBJECT_STORAGE, useValue: storageMock },
        { provide: UPLOAD_INTENTS_REPOSITORY, useValue: intentsMock },
      ],
    }).compile();

    service = module.get<MoviesMediaService>(MoviesMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePoster', () => {
    const movieId = 'movie-123';
    const contentType = 'image/jpeg';

    it('should generate signed upload URL for existing movie', async () => {
      const expectedUploadUrl = 'https://storage.example.com/signed-url';

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue(expectedUploadUrl);

      const result = await service.updatePoster(movieId, contentType);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(intentsMock.createUploadIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'movie_poster',
          entityId: movieId,
          contentType,
        }),
      );
      expect(storageMock.generateSignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket: BucketType.PUBLIC,
          contentType,
        }),
      );
      expect(result.uploadUrl).toBe(expectedUploadUrl);
      expect(result.storageKey).toBeDefined();
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.updatePoster(movieId, contentType)).rejects.toThrow(
        NotFoundException,
      );

      expect(intentsMock.createUploadIntent).not.toHaveBeenCalled();
      expect(storageMock.generateSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid content type', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);

      await expect(
        service.updatePoster(movieId, 'invalid/type'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle png content type', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue('https://url');

      const result = await service.updatePoster(movieId, 'image/png');

      expect(result.storageKey).toContain('.png');
    });
  });

  describe('confirmPoster', () => {
    const movieId = 'movie-123';
    const storageKey = 'posters/123-uuid.jpg';
    const mockIntent = {
      id: 'intent-1',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    it('should confirm poster when intent is valid', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      moviesRepositoryMock.swapPosterPath.mockResolvedValue(null);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await service.confirmPoster(movieId, storageKey);

      expect(intentsMock.consumeIntent).toHaveBeenCalledWith(
        'movie_poster',
        movieId,
        storageKey,
        IntentStatus.IN_PROGRESS,
      );
      expect(storageMock.exists).toHaveBeenCalledWith(
        storageKey,
        BucketType.PUBLIC,
      );
      expect(moviesRepositoryMock.swapPosterPath).toHaveBeenCalledWith(
        movieId,
        storageKey,
      );
      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.COMPLETED,
      );
    });

    it('should delete old poster when it exists', async () => {
      const oldPosterKey = 'posters/old-poster.jpg';

      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      moviesRepositoryMock.swapPosterPath.mockResolvedValue(oldPosterKey);
      intentsMock.updateStatus.mockResolvedValue(undefined);
      storageMock.delete.mockResolvedValue(undefined);

      await service.confirmPoster(movieId, storageKey);

      expect(storageMock.delete).toHaveBeenCalledWith(
        oldPosterKey,
        BucketType.PUBLIC,
      );
    });

    it('should throw BadRequestException when no valid intent found', async () => {
      intentsMock.consumeIntent.mockResolvedValue(null);

      await expect(service.confirmPoster(movieId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(moviesRepositoryMock.swapPosterPath).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when file not found in storage', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(false);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await expect(service.confirmPoster(movieId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.FAILED,
      );
      expect(moviesRepositoryMock.swapPosterPath).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when intent is expired', async () => {
      const expiredIntent = {
        id: 'intent-1',
        expiresAt: new Date(Date.now() - 1000),
      };

      intentsMock.consumeIntent.mockResolvedValue(expiredIntent);
      storageMock.exists.mockResolvedValue(true);
      intentsMock.updateStatus.mockResolvedValue(undefined);
      storageMock.delete.mockResolvedValue(undefined);

      await expect(service.confirmPoster(movieId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        expiredIntent.id,
        IntentStatus.EXPIRED,
      );
      expect(storageMock.delete).toHaveBeenCalledWith(
        storageKey,
        BucketType.PUBLIC,
      );
    });

    it('should cleanup and reset intent if swap fails', async () => {
      const error = new Error('Database error');

      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      moviesRepositoryMock.swapPosterPath.mockRejectedValue(error);
      storageMock.delete.mockResolvedValue(undefined);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await expect(service.confirmPoster(movieId, storageKey)).rejects.toThrow(
        error,
      );

      expect(storageMock.delete).toHaveBeenCalledWith(
        storageKey,
        BucketType.PUBLIC,
      );
      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.PENDING,
      );
    });
  });

  describe('uploadTrailer', () => {
    const movieId = 'movie-123';
    const contentType = 'video/mp4';

    it('should generate signed upload URL for existing movie', async () => {
      const expectedUploadUrl = 'https://storage.example.com/signed-url';

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue(expectedUploadUrl);

      const result = await service.uploadTrailer(movieId, contentType);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(intentsMock.createUploadIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'movie_trailer',
          entityId: movieId,
          contentType,
        }),
      );
      expect(storageMock.generateSignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket: BucketType.PUBLIC,
          contentType,
        }),
      );
      expect(result.uploadUrl).toBe(expectedUploadUrl);
      expect(result.storageKey).toContain('trailer.mp4');
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.uploadTrailer(movieId, contentType)).rejects.toThrow(
        NotFoundException,
      );

      expect(intentsMock.createUploadIntent).not.toHaveBeenCalled();
      expect(storageMock.generateSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid content type', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);

      await expect(
        service.uploadTrailer(movieId, 'invalid/type'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle webm content type', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue('https://url');

      const result = await service.uploadTrailer(movieId, 'video/webm');

      expect(result.storageKey).toContain('trailer.webm');
    });
  });

  describe('confirmTrailer', () => {
    const movieId = 'movie-123';
    const storageKey = 'movies/movie-123/trailer.mp4';
    const mockIntent = {
      id: 'intent-1',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };

    it('should confirm trailer when intent is valid', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      moviesRepositoryMock.swapTrailerPath.mockResolvedValue(null);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await service.confirmTrailer(movieId, storageKey);

      expect(intentsMock.consumeIntent).toHaveBeenCalledWith(
        'movie_trailer',
        movieId,
        storageKey,
        IntentStatus.IN_PROGRESS,
      );
      expect(storageMock.exists).toHaveBeenCalledWith(
        storageKey,
        BucketType.PUBLIC,
      );
      expect(moviesRepositoryMock.swapTrailerPath).toHaveBeenCalledWith(
        movieId,
        storageKey,
      );
      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.COMPLETED,
      );
    });

    it('should delete old trailer when it exists', async () => {
      const oldTrailerKey = 'movies/movie-123/old-trailer.mp4';

      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      moviesRepositoryMock.swapTrailerPath.mockResolvedValue(oldTrailerKey);
      intentsMock.updateStatus.mockResolvedValue(undefined);
      storageMock.delete.mockResolvedValue(undefined);

      await service.confirmTrailer(movieId, storageKey);

      expect(storageMock.delete).toHaveBeenCalledWith(
        oldTrailerKey,
        BucketType.PUBLIC,
      );
    });

    it('should throw BadRequestException when no valid intent found', async () => {
      intentsMock.consumeIntent.mockResolvedValue(null);

      await expect(service.confirmTrailer(movieId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(moviesRepositoryMock.swapTrailerPath).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when file not found in storage', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(false);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await expect(service.confirmTrailer(movieId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.FAILED,
      );
      expect(moviesRepositoryMock.swapTrailerPath).not.toHaveBeenCalled();
    });
  });

  describe('uploadVideo', () => {
    const movieId = 'movie-123';
    const contentType = 'video/mp4';

    it('should generate signed upload URL for existing movie with private bucket', async () => {
      const expectedUploadUrl = 'https://storage.example.com/signed-url';

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue(expectedUploadUrl);

      const result = await service.uploadVideo(movieId, contentType);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(intentsMock.createUploadIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'movie_video',
          entityId: movieId,
          contentType,
        }),
      );
      expect(storageMock.generateSignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket: BucketType.PRIVATE,
          contentType,
        }),
      );
      expect(result.uploadUrl).toBe(expectedUploadUrl);
      expect(result.storageKey).toContain('video.mp4');
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.uploadVideo(movieId, contentType)).rejects.toThrow(
        NotFoundException,
      );

      expect(intentsMock.createUploadIntent).not.toHaveBeenCalled();
      expect(storageMock.generateSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid content type', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);

      await expect(
        service.uploadVideo(movieId, 'invalid/type'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmVideo', () => {
    const movieId = 'movie-123';
    const storageKey = 'movies/movie-123/video.mp4';
    const mockIntent = {
      id: 'intent-1',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };

    it('should confirm video when intent is valid', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      moviesRepositoryMock.swapVideoPath.mockResolvedValue(null);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await service.confirmVideo(movieId, storageKey);

      expect(intentsMock.consumeIntent).toHaveBeenCalledWith(
        'movie_video',
        movieId,
        storageKey,
        IntentStatus.IN_PROGRESS,
      );
      expect(storageMock.exists).toHaveBeenCalledWith(
        storageKey,
        BucketType.PRIVATE,
      );
      expect(moviesRepositoryMock.swapVideoPath).toHaveBeenCalledWith(
        movieId,
        storageKey,
      );
      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.COMPLETED,
      );
    });

    it('should delete old video when it exists', async () => {
      const oldVideoKey = 'movies/movie-123/old-video.mp4';

      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      moviesRepositoryMock.swapVideoPath.mockResolvedValue(oldVideoKey);
      intentsMock.updateStatus.mockResolvedValue(undefined);
      storageMock.delete.mockResolvedValue(undefined);

      await service.confirmVideo(movieId, storageKey);

      expect(storageMock.delete).toHaveBeenCalledWith(
        oldVideoKey,
        BucketType.PRIVATE,
      );
    });

    it('should throw BadRequestException when no valid intent found', async () => {
      intentsMock.consumeIntent.mockResolvedValue(null);

      await expect(service.confirmVideo(movieId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(moviesRepositoryMock.swapVideoPath).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when file not found in storage', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(false);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await expect(service.confirmVideo(movieId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.FAILED,
      );
      expect(moviesRepositoryMock.swapVideoPath).not.toHaveBeenCalled();
    });
  });

  describe('resolvePosterUrl', () => {
    it('should return public URL for poster path', () => {
      const posterPath = 'posters/movie-poster.jpg';
      const expectedUrl =
        'https://storage.example.com/posters/movie-poster.jpg';

      storageMock.getPublicUrl = jest.fn().mockReturnValue(expectedUrl);

      const result = service.resolvePosterUrl(posterPath);

      expect(storageMock.getPublicUrl).toHaveBeenCalledWith(posterPath);
      expect(result).toBe(expectedUrl);
    });

    it('should return default poster URL when posterPath is null', () => {
      const defaultUrl =
        'https://storage.example.com/defaults/movie-poster-default.png';

      storageMock.getPublicUrl = jest.fn().mockReturnValue(defaultUrl);

      const result = service.resolvePosterUrl(null);

      expect(storageMock.getPublicUrl).toHaveBeenCalledWith(
        'defaults/movie-poster-default.png',
      );
      expect(result).toBe(defaultUrl);
    });

    it('should return default poster URL when posterPath is undefined', () => {
      const defaultUrl =
        'https://storage.example.com/defaults/movie-poster-default.png';

      storageMock.getPublicUrl = jest.fn().mockReturnValue(defaultUrl);

      const result = service.resolvePosterUrl(undefined);

      expect(storageMock.getPublicUrl).toHaveBeenCalledWith(
        'defaults/movie-poster-default.png',
      );
      expect(result).toBe(defaultUrl);
    });
  });

  describe('resolveTrailerUrl', () => {
    it('should return public URL for trailer path', () => {
      const trailerPath = 'movies/movie-123/trailer.mp4';
      const expectedUrl =
        'https://storage.example.com/movies/movie-123/trailer.mp4';

      storageMock.getPublicUrl = jest.fn().mockReturnValue(expectedUrl);

      const result = service.resolveTrailerUrl(trailerPath);

      expect(storageMock.getPublicUrl).toHaveBeenCalledWith(trailerPath);
      expect(result).toBe(expectedUrl);
    });

    it('should return null when trailerPath is null', () => {
      const result = service.resolveTrailerUrl(null);

      expect(result).toBeNull();
    });
  });

  describe('resolveVideoUrl', () => {
    it('should return signed URL for video path', async () => {
      const videoPath = 'movies/movie-123/video.mp4';
      const expectedUrl = 'https://storage.example.com/signed-video-url';
      const expectedExpiresMs = 4 * 60 * 60 * 1000;

      storageMock.getSignedUrl = jest.fn().mockResolvedValue(expectedUrl);

      const result = await service.resolveVideoUrl(videoPath);

      expect(storageMock.getSignedUrl).toHaveBeenCalledWith(
        videoPath,
        expectedExpiresMs,
      );
      expect(result).toBe(expectedUrl);
    });

    it('should return null when videoPath is null', async () => {
      const result = await service.resolveVideoUrl(null);

      expect(result).toBeNull();
    });
  });
});
