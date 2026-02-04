import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserEntity } from 'src/database/entities/user.entity';
import { UserRole } from 'src/modules/users/user-role.enum';
import { hash } from 'argon2';
import { AppModule } from 'src/app.module';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { CountryEntity } from 'src/database/entities/country.entity';
import { GenreEntity } from 'src/database/entities/genre.entity';
import { PersonEntity } from 'src/database/entities/person.entity';
import { CreditRoleEntity } from 'src/database/entities/credit-role.entity';
import { MovieCreditEntity } from 'src/database/entities/movie-credit.entity';
import { AgeRating } from 'src/modules/movies/age-rating.enum';
import { OBJECT_STORAGE } from 'src/modules/storage/storage.token';
import type { ObjectStorage } from 'src/modules/storage/object-storage.interface';

describe('AdminMovies (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let admin: UserEntity;

  let testMovieId: string;
  let testCreditId: string;
  let country: CountryEntity;
  let genre: GenreEntity;
  let person: PersonEntity;
  let actorRole: CreditRoleEntity;

  const mockObjectStorage: ObjectStorage = {
    generateSignedUploadUrl: jest
      .fn()
      .mockResolvedValue('https://storage.example.com/signed-upload-url'),
    exists: jest.fn().mockResolvedValue(true),
    getPublicUrl: jest
      .fn()
      .mockReturnValue('https://storage.example.com/public-url'),
    getSignedUrl: jest
      .fn()
      .mockResolvedValue('https://storage.example.com/signed-url'),
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

    country = await dataSource.getRepository(CountryEntity).findOneOrFail({
      where: { code: 'US' },
    });

    genre = await dataSource.getRepository(GenreEntity).save({
      name: `Admin E2E Genre ${Date.now()}`,
    });

    person = await dataSource.getRepository(PersonEntity).save({
      firstName: 'AdminE2E',
      lastName: 'Person',
      dateOfBirth: new Date('1985-03-15'),
      country: country,
    });

    actorRole = await dataSource.getRepository(CreditRoleEntity).findOneOrFail({
      where: { code: 'ACTOR' },
    });

    admin = await dataSource.getRepository(UserEntity).save({
      firstName: 'Admin',
      lastName: 'Movies',
      email: `admin.movies+${Date.now()}@test.com`,
      password: await hash('Password123!'),
      dateOfBirth: '2000-01-01',
      country: country,
      role: UserRole.ADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: admin.email,
        password: 'Password123!',
      });

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /admin/movies', () => {
    it('201 + creates movie successfully', async () => {
      const createMovieDto = {
        title: `Admin Test Movie ${Date.now()}`,
        releaseYear: 2024,
        ageRating: AgeRating.PG_13,
        durationMinutes: 120,
        description: 'Test description',
        countryCodes: ['US'],
        genreIds: [genre.id],
        credits: [],
      };

      const res = await request(app.getHttpServer())
        .post('/admin/movies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createMovieDto)
        .expect(201);

      expect(res.body).toEqual({
        movieId: expect.any(String),
        message: expect.stringContaining('created successfully'),
      });

      testMovieId = res.body.movieId;
    });

    it('201 + creates movie with credits', async () => {
      const createMovieDto = {
        title: `Movie With Credits ${Date.now()}`,
        releaseYear: 2024,
        ageRating: AgeRating.R,
        durationMinutes: 150,
        description: null,
        countryCodes: ['US'],
        genreIds: [genre.id],
        credits: [
          {
            personId: person.id,
            roles: [
              {
                roleId: actorRole.id,
                characterName: 'Main Hero',
                orderIndex: 1,
              },
            ],
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/admin/movies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createMovieDto)
        .expect(201);

      expect(res.body.movieId).toBeDefined();
    });

    it('400 on missing required fields', async () => {
      const invalidDto = {
        title: 'Incomplete Movie',
      };

      await request(app.getHttpServer())
        .post('/admin/movies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400);
    });

    it('409 on duplicate movie (same title + year)', async () => {
      const duplicateDto = {
        title: `Duplicate Movie ${Date.now()}`,
        releaseYear: 2024,
        ageRating: AgeRating.PG,
        durationMinutes: 100,
        countryCodes: ['US'],
        genreIds: [genre.id],
      };

      await request(app.getHttpServer())
        .post('/admin/movies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateDto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/admin/movies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateDto)
        .expect(409);
    });

    it('401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/admin/movies')
        .send({})
        .expect(401);
    });
  });

  describe('PATCH /admin/movies/:id', () => {
    it('200 + updates movie', async () => {
      const updateDto = {
        title: 'Updated Title',
        durationMinutes: 180,
      };

      const res = await request(app.getHttpServer())
        .patch(`/admin/movies/${testMovieId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Movie updated successfully',
      });
    });

    it('400 on empty body', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/movies/${testMovieId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('404 on non-existent movie', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/movies/${randomUUID()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Test' })
        .expect(404);
    });
  });

  describe('PATCH /admin/movies/:id/poster/upload-intent', () => {
    it('200 + returns upload URL and storage key', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/movies/${testMovieId}/poster/upload-intent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentType: 'image/jpeg' })
        .expect(200);

      expect(res.body).toEqual({
        uploadUrl: expect.any(String),
        storageKey: expect.stringMatching(
          /^movies\/posters\/\d+-[a-f0-9-]+\.jpg$/,
        ),
      });
    });

    it('400 for invalid content type', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/movies/${testMovieId}/poster/upload-intent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentType: 'application/pdf' })
        .expect(400);
    });

    it('404 for non-existent movie', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/movies/${randomUUID()}/poster/upload-intent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentType: 'image/jpeg' })
        .expect(404);
    });
  });

  describe('POST /admin/movies/:id/poster/confirm', () => {
    it('201 + confirms poster upload successfully', async () => {
      const intentRes = await request(app.getHttpServer())
        .patch(`/admin/movies/${testMovieId}/poster/upload-intent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentType: 'image/png' });

      const { storageKey } = intentRes.body;

      const confirmRes = await request(app.getHttpServer())
        .post(`/admin/movies/${testMovieId}/poster/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ storageKey })
        .expect(201);

      expect(confirmRes.body).toEqual({
        message: 'Movie poster updated successfully',
      });
    });

    it('400 for invalid storage key format', async () => {
      await request(app.getHttpServer())
        .post(`/admin/movies/${testMovieId}/poster/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ storageKey: 'invalid-key' })
        .expect(400);
    });
  });

  describe('PUT /admin/movies/:id/countries', () => {
    it('200 + updates countries', async () => {
      const res = await request(app.getHttpServer())
        .put(`/admin/movies/${testMovieId}/countries`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ countryCodes: ['US'] })
        .expect(200);

      expect(res.body).toEqual({
        message: 'Movie countries updated successfully',
      });
    });

    it('400 on empty body', async () => {
      await request(app.getHttpServer())
        .put(`/admin/movies/${testMovieId}/countries`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('PUT /admin/movies/:id/genres', () => {
    it('200 + updates genres', async () => {
      const res = await request(app.getHttpServer())
        .put(`/admin/movies/${testMovieId}/genres`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ genreIds: [genre.id] })
        .expect(200);

      expect(res.body).toEqual({
        message: 'Movie genres updated successfully',
      });
    });
  });

  describe('POST /admin/movies/:id/credits', () => {
    it('200 + adds credits', async () => {
      const creditsDto = [
        {
          personId: person.id,
          roles: [
            {
              roleId: actorRole.id,
              characterName: 'New Character',
              orderIndex: 1,
            },
          ],
        },
      ];

      const res = await request(app.getHttpServer())
        .post(`/admin/movies/${testMovieId}/credits`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(creditsDto)
        .expect(201);

      expect(res.body).toEqual({
        message: 'Movie credits added successfully',
      });

      const credit = await dataSource
        .getRepository(MovieCreditEntity)
        .findOne({ where: { movieId: testMovieId } });
      testCreditId = credit!.id;
    });

    it('404 on non-existent movie', async () => {
      await request(app.getHttpServer())
        .post(`/admin/movies/${randomUUID()}/credits`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send([
          {
            personId: person.id,
            roles: [
              { roleId: actorRole.id, characterName: 'X', orderIndex: 1 },
            ],
          },
        ])
        .expect(404);
    });
  });

  describe('PATCH /admin/movies/:id/credits/:creditId', () => {
    it('200 + updates credit', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/movies/${testMovieId}/credits/${testCreditId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ characterName: 'Updated Character', orderIndex: 99 })
        .expect(200);

      expect(res.body).toEqual({
        message: 'Movie credit updated successfully',
      });
    });

    it('400 on empty body', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/movies/${testMovieId}/credits/${testCreditId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('404 on non-existent credit', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/movies/${testMovieId}/credits/${randomUUID()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ characterName: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /admin/movies/:id/credits/:creditId', () => {
    it('200 + deletes credit', async () => {
      await request(app.getHttpServer())
        .post(`/admin/movies/${testMovieId}/credits`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send([
          {
            personId: person.id,
            roles: [
              {
                roleId: actorRole.id,
                characterName: 'ToDelete',
                orderIndex: 50,
              },
            ],
          },
        ]);

      const creditToDelete = await dataSource
        .getRepository(MovieCreditEntity)
        .findOne({
          where: { movieId: testMovieId, characterName: 'ToDelete' },
        });

      const res = await request(app.getHttpServer())
        .delete(`/admin/movies/${testMovieId}/credits/${creditToDelete!.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Movie credit deleted successfully',
      });
    });

    it('404 on non-existent credit', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/movies/${testMovieId}/credits/${randomUUID()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('DELETE /admin/movies/:id', () => {
    it('200 + deletes movie', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/admin/movies')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: `Movie To Delete ${Date.now()}`,
          releaseYear: 2024,
          ageRating: AgeRating.G,
          durationMinutes: 90,
          countryCodes: ['US'],
          genreIds: [genre.id],
        });

      const movieToDeleteId = createRes.body.movieId;

      const res = await request(app.getHttpServer())
        .delete(`/admin/movies/${movieToDeleteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Movie deleted successfully',
      });

      await request(app.getHttpServer())
        .get(`/movies/${movieToDeleteId}`)
        .expect(404);
    });

    it('404 on non-existent movie', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/movies/${randomUUID()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
