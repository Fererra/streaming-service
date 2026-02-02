import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MoviesMediaService } from 'src/modules/movies/services/movies-media.service';
import { MOVIES_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { IMAGE_STORAGE } from 'src/modules/storage/storage.token';
import { ImageStoragePath } from 'src/modules/storage/storage-path.enum';

describe('MoviesMediaService', () => {
  let service: MoviesMediaService;

  const moviesRepositoryMock = {
    existsBy: jest.fn(),
    findPosterPathById: jest.fn(),
    update: jest.fn(),
  };

  const imageStorageMock = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesMediaService,
        { provide: MOVIES_REPOSITORY, useValue: moviesRepositoryMock },
        { provide: IMAGE_STORAGE, useValue: imageStorageMock },
      ],
    }).compile();

    service = module.get<MoviesMediaService>(MoviesMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePoster', () => {
    const movieId = 'movie-123';
    const posterInput = {
      buffer: Buffer.from('image-data'),
      contentType: 'image/jpeg',
    };

    it('should update poster for movie without existing poster', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.findPosterPathById.mockResolvedValue(null);
      imageStorageMock.upload.mockResolvedValue({
        storageKey: 'new-poster-key',
      });
      moviesRepositoryMock.update.mockResolvedValue(undefined);

      await service.updatePoster(movieId, posterInput);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(moviesRepositoryMock.findPosterPathById).toHaveBeenCalledWith(
        movieId,
      );
      expect(imageStorageMock.upload).toHaveBeenCalledWith(posterInput, {
        path: ImageStoragePath.MOVIE_POSTERS,
        extension: 'jpg',
        isPublic: true,
      });
      expect(moviesRepositoryMock.update).toHaveBeenCalledWith(movieId, {
        posterPath: 'new-poster-key',
      });
      expect(imageStorageMock.delete).not.toHaveBeenCalled();
    });

    it('should update poster and delete old one', async () => {
      const oldPosterKey = 'old-poster-key';

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.findPosterPathById.mockResolvedValue(oldPosterKey);
      imageStorageMock.upload.mockResolvedValue({
        storageKey: 'new-poster-key',
      });
      moviesRepositoryMock.update.mockResolvedValue(undefined);
      imageStorageMock.delete.mockResolvedValue(undefined);

      await service.updatePoster(movieId, posterInput);

      expect(imageStorageMock.delete).toHaveBeenCalledWith(oldPosterKey, true);
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.updatePoster(movieId, posterInput)).rejects.toThrow(
        NotFoundException,
      );

      expect(imageStorageMock.upload).not.toHaveBeenCalled();
    });

    it('should handle png content type', async () => {
      const pngPoster = {
        buffer: Buffer.from('png-data'),
        contentType: 'image/png',
      };

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.findPosterPathById.mockResolvedValue(null);
      imageStorageMock.upload.mockResolvedValue({ storageKey: 'new-key' });
      moviesRepositoryMock.update.mockResolvedValue(undefined);

      await service.updatePoster(movieId, pngPoster);

      expect(imageStorageMock.upload).toHaveBeenCalledWith(pngPoster, {
        path: ImageStoragePath.MOVIE_POSTERS,
        extension: 'png',
        isPublic: true,
      });
    });

    it('should delete uploaded file if update fails', async () => {
      const newStorageKey = 'new-poster-key';

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.findPosterPathById.mockResolvedValue(null);
      imageStorageMock.upload.mockResolvedValue({ storageKey: newStorageKey });
      moviesRepositoryMock.update.mockRejectedValue(new Error('DB Error'));

      await expect(service.updatePoster(movieId, posterInput)).rejects.toThrow(
        'DB Error',
      );

      expect(imageStorageMock.delete).toHaveBeenCalledWith(newStorageKey, true);
    });

    it('should use bin extension for unknown content type', async () => {
      const unknownTypePoster = {
        buffer: Buffer.from('data'),
        contentType: 'application/octet-stream',
      };

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.findPosterPathById.mockResolvedValue(null);
      imageStorageMock.upload.mockResolvedValue({ storageKey: 'key' });
      moviesRepositoryMock.update.mockResolvedValue(undefined);

      await service.updatePoster(movieId, unknownTypePoster);

      expect(imageStorageMock.upload).toHaveBeenCalledWith(
        unknownTypePoster,
        expect.objectContaining({ extension: 'bin' }),
      );
    });
  });
});
