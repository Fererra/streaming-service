import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { DataSource } from 'typeorm';
import { GenreEntity } from 'src/database/entities/genre.entity';
import { CountryEntity } from 'src/database/entities/country.entity';
import { MovieEntity } from 'src/database/entities/movie.entity';
import { AgeRating } from 'src/modules/movies/age-rating.enum';
import { OBJECT_STORAGE } from 'src/modules/storage/storage.token';
import type { ObjectStorage } from 'src/modules/storage/object-storage.interface';
import { UserEntity } from 'src/database/entities/user.entity';
import { hash } from 'argon2';

describe('MoviesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testMovieId: string;
  let accessToken: string;

  let genre: GenreEntity;
  let country: CountryEntity;

  const mockObjectStorage: ObjectStorage = {
    generateSignedUploadUrl: jest
      .fn()
      .mockResolvedValue('https://storage.example.com/signed-upload-url'),
    exists: jest.fn().mockResolvedValue(true),
    getPublicUrl: jest
      .fn()
      .mockImplementation(
        (key: string) => `https://storage.example.com/${key}`,
      ),
    getSignedUrl: jest
      .fn()
      .mockResolvedValue('https://storage.example.com/signed-video-url'),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(mockObjectStorage)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);

    genre = await dataSource.getRepository(GenreEntity).save({
      name: `E2E Genre ${Date.now()}`,
    });

    country = await dataSource.getRepository(CountryEntity).findOneOrFail({
      where: { code: 'US' },
    });

    const movie = await dataSource.getRepository(MovieEntity).save({
      title: `E2E Test Movie ${Date.now()}`,
      releaseYear: 2024,
      ageRating: AgeRating.PG_13,
      durationMinutes: 120,
      genres: [genre],
      countries: [country],
    });
    testMovieId = movie.id;

    const user = await dataSource.getRepository(UserEntity).save({
      firstName: 'Movies',
      lastName: 'E2E',
      email: `movies.e2e+${Date.now()}@test.com`,
      password: await hash('Password123!'),
      dateOfBirth: '2000-01-01',
      country: country,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: 'Password123!',
      });

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /movies', () => {
    it('200 + paginated movies', async () => {
      const response = await request(app.getHttpServer())
        .get('/movies')
        .expect(200);

      expect(response.body.meta).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          lastPage: expect.any(Number),
        }),
      );
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('200 + respects pagination params', async () => {
      const response = await request(app.getHttpServer())
        .get('/movies?page=1&limit=5')
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /movies/search', () => {
    it('200 + search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/movies/search?title=E2E')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toBeDefined();
    });

    it('400 on missing title param', async () => {
      await request(app.getHttpServer()).get('/movies/search').expect(400);
    });
  });

  describe('GET /movies/:id', () => {
    it('200 + movie details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/movies/${testMovieId}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: testMovieId,
          title: expect.any(String),
          releaseYear: expect.any(Number),
          ageRating: expect.any(String),
          durationMinutes: expect.any(Number),
          genres: expect.any(Array),
          countries: expect.any(Array),
          directors: expect.any(Array),
          actors: expect.any(Array),
        }),
      );
    });

    it('404 on non-existent movie', async () => {
      await request(app.getHttpServer())
        .get('/movies/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('400 on invalid UUID', async () => {
      await request(app.getHttpServer()).get('/movies/invalid-id').expect(400);
    });
  });

  describe('GET /movies/:id/credits', () => {
    it('200 + movie credits', async () => {
      const response = await request(app.getHttpServer())
        .get(`/movies/${testMovieId}/credits`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('404 on non-existent movie', async () => {
      await request(app.getHttpServer())
        .get('/movies/00000000-0000-0000-0000-000000000000/credits')
        .expect(404);
    });
  });

  describe('GET /movies/:id/video', () => {
    it('401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/movies/${testMovieId}/video`)
        .expect(401);
    });

    it('200 + returns signed video URL', async () => {
      await dataSource
        .getRepository(MovieEntity)
        .update(testMovieId, { moviePath: 'movies/test-video.mp4' });

      const response = await request(app.getHttpServer())
        .get(`/movies/${testMovieId}/video`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({
        videoUrl: 'https://storage.example.com/signed-video-url',
      });
    });

    it('200 + returns null when no video available', async () => {
      await dataSource
        .getRepository(MovieEntity)
        .update(testMovieId, { moviePath: null });

      const response = await request(app.getHttpServer())
        .get(`/movies/${testMovieId}/video`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({ videoUrl: null });
    });

    it('404 on non-existent movie', async () => {
      await request(app.getHttpServer())
        .get('/movies/00000000-0000-0000-0000-000000000000/video')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('400 on invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/movies/invalid-id/video')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });
});
