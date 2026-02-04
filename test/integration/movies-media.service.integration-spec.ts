import { Test } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MoviesMediaService } from 'src/modules/movies/services/movies-media.service';
import { MoviesModule } from 'src/modules/movies/movies.module';
import { DatabaseModule } from 'src/database/database.module';
import { ReferenceModule } from 'src/modules/reference/reference.module';
import { PersonsModule } from 'src/modules/persons/persons.module';
import { CountryEntity } from 'src/database/entities/country.entity';
import { GenreEntity } from 'src/database/entities/genre.entity';
import { MovieEntity } from 'src/database/entities/movie.entity';
import { UploadIntentEntity } from 'src/database/entities/upload-intent.entity';
import { OBJECT_STORAGE } from 'src/modules/storage/storage.token';
import { IntentStatus } from 'src/modules/storage/intent-status.enum';
import { AgeRating } from 'src/modules/movies/age-rating.enum';

describe('MoviesMediaService (integration)', () => {
  let app: INestApplication;
  let moviesMediaService: MoviesMediaService;
  let dataSource: DataSource;
  let country: CountryEntity;
  let genre: GenreEntity;

  const storageMock = {
    generateSignedUploadUrl: jest.fn().mockResolvedValue('https://signed-url'),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
    upload: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, MoviesModule, ReferenceModule, PersonsModule],
    })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(storageMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    moviesMediaService = app.get(MoviesMediaService);
    dataSource = app.get(DataSource);

    await dataSource.query('TRUNCATE TABLE movies RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE upload_intents RESTART IDENTITY CASCADE',
    );

    country = (await dataSource.getRepository(CountryEntity).findOneBy({
      code: 'US',
    })) as CountryEntity;

    genre = (await dataSource.getRepository(GenreEntity).findOneBy({
      name: 'Action',
    })) as GenreEntity;
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE movies RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE upload_intents RESTART IDENTITY CASCADE',
    );
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  const createMovie = async (overrides: Partial<MovieEntity> = {}) => {
    const movieRepo = dataSource.getRepository(MovieEntity);
    const movie = movieRepo.create({
      title: 'Test Movie',
      releaseYear: 2024,
      durationMinutes: 120,
      countries: [country],
      genres: [genre],
      ...overrides,
    });
    movie.ageRating = overrides.ageRating ?? AgeRating.PG_13;
    return movieRepo.save(movie);
  };

  describe('updatePoster', () => {
    it('creates upload intent and returns signed URL', async () => {
      const movie = await createMovie();

      const result = await moviesMediaService.updatePoster(
        movie.id,
        'image/webp',
      );

      expect(result.uploadUrl).toBe('https://signed-url');
      expect(result.storageKey).toContain('posters/');
      expect(result.storageKey).toContain('.webp');

      const intentRepo = dataSource.getRepository(UploadIntentEntity);
      const intent = await intentRepo.findOneBy({
        entityId: movie.id,
        entityType: 'movie_poster',
      });

      expect(intent).toBeDefined();
      expect(intent!.status).toBe(IntentStatus.PENDING);
      expect(intent!.storageKey).toBe(result.storageKey);
    });

    it('throws NotFoundException for non-existent movie', async () => {
      await expect(
        moviesMediaService.updatePoster(
          '00000000-0000-0000-0000-000000000000',
          'image/jpeg',
        ),
      ).rejects.toThrow('Movie not found');
    });
  });

  describe('confirmPoster', () => {
    it('confirms poster upload and updates movie', async () => {
      const movie = await createMovie();

      const { storageKey } = await moviesMediaService.updatePoster(
        movie.id,
        'image/jpeg',
      );

      await moviesMediaService.confirmPoster(movie.id, storageKey);

      const updatedMovie = await dataSource
        .getRepository(MovieEntity)
        .findOneBy({ id: movie.id });

      expect(updatedMovie!.posterPath).toBe(storageKey);

      const intent = await dataSource
        .getRepository(UploadIntentEntity)
        .findOneBy({ entityId: movie.id });

      expect(intent!.status).toBe(IntentStatus.COMPLETED);
    });

    it('deletes old poster when updating to new one', async () => {
      const oldPosterPath = 'posters/old-poster.jpg';
      const movie = await createMovie({ posterPath: oldPosterPath });

      const { storageKey } = await moviesMediaService.updatePoster(
        movie.id,
        'image/jpeg',
      );

      await moviesMediaService.confirmPoster(movie.id, storageKey);

      expect(storageMock.delete).toHaveBeenCalledWith(
        oldPosterPath,
        expect.anything(),
      );
    });

    it('throws BadRequestException when no valid intent exists', async () => {
      const movie = await createMovie();

      await expect(
        moviesMediaService.confirmPoster(movie.id, 'non-existent-key'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when file does not exist in storage', async () => {
      const movie = await createMovie();
      storageMock.exists.mockResolvedValueOnce(false);

      const { storageKey } = await moviesMediaService.updatePoster(
        movie.id,
        'image/jpeg',
      );

      await expect(
        moviesMediaService.confirmPoster(movie.id, storageKey),
      ).rejects.toThrow('File not found in storage');

      const intent = await dataSource
        .getRepository(UploadIntentEntity)
        .findOneBy({ entityId: movie.id });

      expect(intent!.status).toBe(IntentStatus.FAILED);
    });

    it('throws BadRequestException when intent is expired', async () => {
      const movie = await createMovie();

      const intentRepo = dataSource.getRepository(UploadIntentEntity);
      const storageKey = 'posters/expired-test.jpg';
      await intentRepo.save({
        entityType: 'movie_poster',
        entityId: movie.id,
        storageKey,
        contentType: 'image/jpeg',
        expiresAt: new Date(Date.now() - 1000),
        status: IntentStatus.PENDING,
      });

      await expect(
        moviesMediaService.confirmPoster(movie.id, storageKey),
      ).rejects.toThrow('Upload intent expired');

      const intent = await intentRepo.findOneBy({ entityId: movie.id });
      expect(intent!.status).toBe(IntentStatus.EXPIRED);

      expect(storageMock.delete).toHaveBeenCalledWith(
        storageKey,
        expect.anything(),
      );
    });

    it('prevents double confirmation (race condition)', async () => {
      const movie = await createMovie();

      const { storageKey } = await moviesMediaService.updatePoster(
        movie.id,
        'image/jpeg',
      );

      await moviesMediaService.confirmPoster(movie.id, storageKey);

      await expect(
        moviesMediaService.confirmPoster(movie.id, storageKey),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles concurrent confirmations correctly with pessimistic locking', async () => {
      const movie = await createMovie();

      const { storageKey } = await moviesMediaService.updatePoster(
        movie.id,
        'image/jpeg',
      );

      const results = await Promise.allSettled([
        moviesMediaService.confirmPoster(movie.id, storageKey),
        moviesMediaService.confirmPoster(movie.id, storageKey),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });
});
