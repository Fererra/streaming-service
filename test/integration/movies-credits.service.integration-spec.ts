import { Test } from '@nestjs/testing';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MoviesCreditsService } from 'src/modules/movies/services/movies-credits.service';
import { MoviesService } from 'src/modules/movies/services/movies.service';
import { DatabaseModule } from 'src/database/database.module';
import { ReferenceModule } from 'src/modules/reference/reference.module';
import { PersonsModule } from 'src/modules/persons/persons.module';
import { CountryEntity } from 'src/database/entities/country.entity';
import { GenreEntity } from 'src/database/entities/genre.entity';
import { PersonEntity } from 'src/database/entities/person.entity';
import { CreditRoleEntity } from 'src/database/entities/credit-role.entity';
import { MovieEntity } from 'src/database/entities/movie.entity';
import { MovieCreditEntity } from 'src/database/entities/movie-credit.entity';
import { AgeRating } from 'src/modules/movies/age-rating.enum';
import { OBJECT_STORAGE } from 'src/modules/storage/storage.token';
import { ObjectStorage } from 'src/modules/storage/object-storage.interface';
import { MoviesModule } from 'src/modules/movies/movies.module';
import { JwtGuard } from 'src/modules/auth/guards/jwt.guard';

describe('MoviesCreditsService (integration)', () => {
  let app: INestApplication;
  let moviesCreditsService: MoviesCreditsService;
  let moviesService: MoviesService;
  let dataSource: DataSource;

  let country: CountryEntity;
  let genre: GenreEntity;
  let person1: PersonEntity;
  let person2: PersonEntity;
  let actorRole: CreditRoleEntity;
  let directorRole: CreditRoleEntity;
  let testMovie: MovieEntity;

  const storageMock: Partial<ObjectStorage> = {
    generateSignedUploadUrl: jest.fn(),
    delete: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, MoviesModule, ReferenceModule, PersonsModule],
    })
      .overrideGuard(JwtGuard)
      .useValue(GuardMock)
      .overrideProvider(OBJECT_STORAGE)
      .useValue(storageMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    moviesCreditsService = app.get(MoviesCreditsService);
    moviesService = app.get(MoviesService);
    dataSource = app.get(DataSource);

    country = (await dataSource.getRepository(CountryEntity).findOneBy({
      code: 'US',
    })) as CountryEntity;

    genre = (await dataSource.getRepository(GenreEntity).findOneBy({
      name: `Action`,
    })) as GenreEntity;

    person1 = await dataSource.getRepository(PersonEntity).save({
      firstName: 'Tom',
      lastName: 'Hanks',
      dateOfBirth: new Date('1956-07-09'),
      country: country,
    });

    person2 = await dataSource.getRepository(PersonEntity).save({
      firstName: 'Steven',
      lastName: 'Spielberg',
      dateOfBirth: new Date('1946-12-18'),
      country: country,
    });

    actorRole = (await dataSource.getRepository(CreditRoleEntity).findOneBy({
      code: 'ACTOR',
    })) as CreditRoleEntity;

    directorRole = (await dataSource.getRepository(CreditRoleEntity).findOneBy({
      code: 'DIRECTOR',
    })) as CreditRoleEntity;
  });

  beforeEach(async () => {
    testMovie = await moviesService.create({
      title: `Test Movie ${Date.now()}`,
      releaseYear: 2024,
      ageRating: AgeRating.PG_13,
      durationMinutes: 120,
      description: 'Test',
      countryCodes: ['US'],
      genreIds: [genre.id],
      credits: [],
    });
  });

  afterEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE movie_credits RESTART IDENTITY CASCADE',
    );
    await dataSource.query('TRUNCATE TABLE movies RESTART IDENTITY CASCADE');
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('getMovieCredits', () => {
    it('should return empty array for movie without credits', async () => {
      const credits = await moviesCreditsService.getMovieCredits(testMovie.id);

      expect(credits).toEqual([]);
    });

    it('should return grouped credits by role', async () => {
      await moviesCreditsService.addCredits(testMovie.id, [
        {
          personId: person1.id,
          roles: [
            { roleId: actorRole.id, characterName: 'Hero', orderIndex: 1 },
          ],
        },
        {
          personId: person2.id,
          roles: [
            { roleId: directorRole.id, characterName: null, orderIndex: 1 },
          ],
        },
      ]);

      const credits = await moviesCreditsService.getMovieCredits(testMovie.id);

      expect(credits).toHaveLength(2);

      const actorCredits = credits.find((c) => c.role.code === 'ACTOR');
      const directorCredits = credits.find((c) => c.role.code === 'DIRECTOR');

      expect(actorCredits?.people).toHaveLength(1);
      expect(actorCredits?.people[0].person.name).toBe('Tom Hanks');

      expect(directorCredits?.people).toHaveLength(1);
      expect(directorCredits?.people[0].person.name).toBe('Steven Spielberg');
    });

    it('should group multiple roles for same person', async () => {
      await moviesCreditsService.addCredits(testMovie.id, [
        {
          personId: person1.id,
          roles: [
            {
              roleId: actorRole.id,
              characterName: 'Character 1',
              orderIndex: 1,
            },
            {
              roleId: actorRole.id,
              characterName: 'Character 2',
              orderIndex: 2,
            },
          ],
        },
      ]);

      const credits = await moviesCreditsService.getMovieCredits(testMovie.id);

      expect(credits).toHaveLength(1);
      expect(credits[0].people).toHaveLength(1);
      expect(credits[0].people[0].roles).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent movie', async () => {
      await expect(
        moviesCreditsService.getMovieCredits(
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addCredits', () => {
    it('should add credits to movie', async () => {
      await moviesCreditsService.addCredits(testMovie.id, [
        {
          personId: person1.id,
          roles: [
            { roleId: actorRole.id, characterName: 'Forrest', orderIndex: 1 },
          ],
        },
      ]);

      const credits = await dataSource.getRepository(MovieCreditEntity).find({
        where: { movieId: testMovie.id },
      });

      expect(credits).toHaveLength(1);
      expect(credits[0].personId).toBe(person1.id);
      expect(credits[0].characterName).toBe('Forrest');
    });

    it('should add multiple people with multiple roles', async () => {
      await moviesCreditsService.addCredits(testMovie.id, [
        {
          personId: person1.id,
          roles: [
            { roleId: actorRole.id, characterName: 'Role 1', orderIndex: 1 },
            { roleId: actorRole.id, characterName: 'Role 2', orderIndex: 2 },
          ],
        },
        {
          personId: person2.id,
          roles: [
            { roleId: directorRole.id, characterName: null, orderIndex: 1 },
          ],
        },
      ]);

      const credits = await dataSource.getRepository(MovieCreditEntity).find({
        where: { movieId: testMovie.id },
      });

      expect(credits).toHaveLength(3);
    });

    it('should throw NotFoundException for non-existent movie', async () => {
      await expect(
        moviesCreditsService.addCredits(
          '00000000-0000-0000-0000-000000000000',
          [
            {
              personId: person1.id,
              roles: [
                { roleId: actorRole.id, characterName: 'Test', orderIndex: 1 },
              ],
            },
          ],
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCredit', () => {
    let creditId: string;

    beforeEach(async () => {
      await moviesCreditsService.addCredits(testMovie.id, [
        {
          personId: person1.id,
          roles: [
            { roleId: actorRole.id, characterName: 'Original', orderIndex: 1 },
          ],
        },
      ]);

      const credit = await dataSource.getRepository(MovieCreditEntity).findOne({
        where: { movieId: testMovie.id },
      });
      creditId = credit!.id;
    });

    it('should update credit character name', async () => {
      await moviesCreditsService.updateCredit(testMovie.id, creditId, {
        characterName: 'Updated Name',
      });

      const updated = await dataSource
        .getRepository(MovieCreditEntity)
        .findOne({ where: { id: creditId } });

      expect(updated?.characterName).toBe('Updated Name');
    });

    it('should update credit order index', async () => {
      await moviesCreditsService.updateCredit(testMovie.id, creditId, {
        orderIndex: 99,
      });

      const updated = await dataSource
        .getRepository(MovieCreditEntity)
        .findOne({ where: { id: creditId } });

      expect(updated?.orderIndex).toBe(99);
    });

    it('should throw NotFoundException for non-existent credit', async () => {
      await expect(
        moviesCreditsService.updateCredit(
          testMovie.id,
          '00000000-0000-0000-0000-000000000000',
          { characterName: 'Test' },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when credit belongs to different movie', async () => {
      const otherMovie = await moviesService.create({
        title: 'Other Movie',
        releaseYear: 2025,
        ageRating: AgeRating.PG_13,
        durationMinutes: 100,
        description: null,
        countryCodes: ['US'],
        genreIds: [genre.id],
        credits: [],
      });

      await expect(
        moviesCreditsService.updateCredit(otherMovie.id, creditId, {
          characterName: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCredit', () => {
    let creditId: string;

    beforeEach(async () => {
      await moviesCreditsService.addCredits(testMovie.id, [
        {
          personId: person1.id,
          roles: [
            { roleId: actorRole.id, characterName: 'ToDelete', orderIndex: 1 },
          ],
        },
      ]);

      const credit = await dataSource.getRepository(MovieCreditEntity).findOne({
        where: { movieId: testMovie.id },
      });
      creditId = credit!.id;
    });

    it('should delete credit', async () => {
      await moviesCreditsService.deleteCredit(testMovie.id, creditId);

      const deleted = await dataSource
        .getRepository(MovieCreditEntity)
        .findOne({ where: { id: creditId } });

      expect(deleted).toBeNull();
    });

    it('should throw NotFoundException for non-existent credit', async () => {
      await expect(
        moviesCreditsService.deleteCredit(
          testMovie.id,
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when credit belongs to different movie', async () => {
      const otherMovie = await moviesService.create({
        title: 'Other Movie 2',
        releaseYear: 2026,
        ageRating: AgeRating.PG_13,
        durationMinutes: 100,
        description: null,
        countryCodes: ['US'],
        genreIds: [genre.id],
        credits: [],
      });

      await expect(
        moviesCreditsService.deleteCredit(otherMovie.id, creditId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
