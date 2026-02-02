import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MoviesService } from 'src/modules/movies/services/movies.service';
import { MoviesModule } from 'src/modules/movies/movies.module';
import { DatabaseModule } from 'src/database/database.module';
import { ReferenceModule } from 'src/modules/reference/reference.module';
import { PersonsModule } from 'src/modules/persons/persons.module';
import { CountryEntity } from 'src/database/entities/country.entity';
import { GenreEntity } from 'src/database/entities/genre.entity';
import { PersonEntity } from 'src/database/entities/person.entity';
import { CreditRoleEntity } from 'src/database/entities/credit-role.entity';
import { MovieEntity } from 'src/database/entities/movie.entity';
import { AgeRating } from 'src/modules/movies/age-rating.enum';
import { IMAGE_STORAGE } from 'src/modules/storage/storage.token';
import { ImageStorage } from 'src/modules/storage/image-storage.interface';

describe('MoviesService (integration)', () => {
  let app: INestApplication;
  let moviesService: MoviesService;
  let dataSource: DataSource;

  let country: CountryEntity;
  let genre: GenreEntity;
  let person: PersonEntity;
  let actorRole: CreditRoleEntity;

  const imageStorageMock: Partial<ImageStorage> = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, MoviesModule, ReferenceModule, PersonsModule],
    })
      .overrideProvider(IMAGE_STORAGE)
      .useValue(imageStorageMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    moviesService = app.get(MoviesService);
    dataSource = app.get(DataSource);

    country = (await dataSource.getRepository(CountryEntity).findOneBy({
      code: 'US',
    })) as CountryEntity;

    genre = (await dataSource.getRepository(GenreEntity).findOneBy({
      name: 'Action',
    })) as GenreEntity;

    person = await dataSource.getRepository(PersonEntity).save({
      firstName: 'Tom',
      lastName: 'Hanks',
      dateOfBirth: new Date('1956-07-09'),
      country: country,
    });

    actorRole = (await dataSource.getRepository(CreditRoleEntity).findOneBy({
      code: 'ACTOR',
    })) as CreditRoleEntity;
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

  const createMovieDto = (overrides = {}) => ({
    title: 'Test Movie',
    releaseYear: 2024,
    ageRating: AgeRating.PG_13,
    durationMinutes: 120,
    description: 'A test movie',
    countryCodes: ['US'],
    genreIds: [genre.id],
    credits: [],
    ...overrides,
  });

  describe('create', () => {
    it('should create a movie successfully', async () => {
      const movie = await moviesService.create(createMovieDto());

      expect(movie).toBeDefined();
      expect(movie.id).toBeDefined();
      expect(movie.title).toBe('Test Movie');
      expect(movie.releaseYear).toBe(2024);
    });

    it('should create a movie with credits', async () => {
      const movieDto = createMovieDto({
        title: 'Forrest Gump',
        credits: [
          {
            personId: person.id,
            roles: [
              {
                roleId: actorRole.id,
                characterName: 'Forrest Gump',
                orderIndex: 1,
              },
            ],
          },
        ],
      });

      const movie = await moviesService.create(movieDto);

      expect(movie).toBeDefined();
      expect(movie.id).toBeDefined();

      const savedMovie = await dataSource.getRepository(MovieEntity).findOne({
        where: { id: movie.id },
        relations: ['credits'],
      });

      expect(savedMovie?.credits).toHaveLength(1);
      expect(savedMovie?.credits[0].characterName).toBe('Forrest Gump');
    });

    it('should throw ConflictException for duplicate movie', async () => {
      await moviesService.create(createMovieDto());

      await expect(moviesService.create(createMovieDto())).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow same title with different release year', async () => {
      await moviesService.create(createMovieDto({ releaseYear: 2024 }));

      const movie2 = await moviesService.create(
        createMovieDto({ releaseYear: 2025 }),
      );

      expect(movie2).toBeDefined();
      expect(movie2.releaseYear).toBe(2025);
    });
  });

  describe('findAll', () => {
    it('should return paginated movies', async () => {
      await moviesService.create(createMovieDto({ title: 'Movie 1' }));
      await moviesService.create(createMovieDto({ title: 'Movie 2' }));

      const result = await moviesService.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      for (let i = 0; i < 15; i++) {
        await moviesService.create(
          createMovieDto({ title: `Movie ${i}`, releaseYear: 2000 + i }),
        );
      }

      const page1 = await moviesService.findAll({ page: 1, limit: 10 });
      const page2 = await moviesService.findAll({ page: 2, limit: 10 });

      expect(page1.data).toHaveLength(10);
      expect(page2.data).toHaveLength(5);
      expect(page1.meta.total).toBe(15);
    });
  });

  describe('searchMovies', () => {
    beforeEach(async () => {
      await moviesService.create(createMovieDto({ title: 'The Matrix' }));
      await moviesService.create(
        createMovieDto({ title: 'Matrix Reloaded', releaseYear: 2003 }),
      );
      await moviesService.create(
        createMovieDto({ title: 'Inception', releaseYear: 2010 }),
      );
    });

    it('should find movies by title', async () => {
      const result = await moviesService.searchMovies('Matrix', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((m) => m.title.includes('Matrix'))).toBe(true);
    });

    it('should return empty for no matches', async () => {
      const result = await moviesService.searchMovies('Nonexistent', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should be case-insensitive', async () => {
      const result = await moviesService.searchMovies('matrix', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
    });
  });

  describe('getMovieById', () => {
    it('should return movie details with relations', async () => {
      expect(person).toBeDefined();
      expect(actorRole).toBeDefined();
      expect(genre).toBeDefined();
      expect(country).toBeDefined();

      const created = await moviesService.create(
        createMovieDto({
          credits: [
            {
              personId: person.id,
              roles: [
                { roleId: actorRole.id, characterName: 'Hero', orderIndex: 1 },
              ],
            },
          ],
        }),
      );

      const movie = await moviesService.getMovieById(created.id);

      expect(movie.id).toBe(created.id);
      expect(movie.title).toBe('Test Movie');
      expect(movie.genres).toHaveLength(1);
      expect(movie.genres[0].name).toBe('Action');
      expect(movie.countries).toHaveLength(1);
      expect(movie.countries[0].code).toBe('US');
      expect(movie.actors).toHaveLength(1);
      expect(movie.actors[0].characterName).toBe('Hero');
    });

    it('should throw NotFoundException for non-existent movie', async () => {
      await expect(
        moviesService.getMovieById('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update movie properties', async () => {
      const movie = await moviesService.create(createMovieDto());

      await moviesService.update(movie.id, {
        title: 'Updated Title',
        durationMinutes: 150,
      });

      const updated = await moviesService.getMovieById(movie.id);

      expect(updated.title).toBe('Updated Title');
      expect(updated.durationMinutes).toBe(150);
    });

    it('should throw NotFoundException for non-existent movie', async () => {
      await expect(
        moviesService.update('00000000-0000-0000-0000-000000000000', {
          title: 'New',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing title/year', async () => {
      await moviesService.create(createMovieDto({ title: 'Movie A' }));
      const movieB = await moviesService.create(
        createMovieDto({ title: 'Movie B' }),
      );

      await expect(
        moviesService.update(movieB.id, { title: 'Movie A' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCountries', () => {
    it('should update movie countries', async () => {
      const country2 = await dataSource.getRepository(CountryEntity).save({
        code: 'GB',
        countryName: 'United Kingdom',
      });

      const movie = await moviesService.create(createMovieDto());

      await moviesService.updateCountries(movie.id, ['US', 'GB']);

      const updated = await moviesService.getMovieById(movie.id);

      expect(updated.countries).toHaveLength(2);
      expect(updated.countries.map((c) => c.code).sort()).toEqual(['GB', 'US']);
    });

    it('should throw NotFoundException for non-existent movie', async () => {
      await expect(
        moviesService.updateCountries('00000000-0000-0000-0000-000000000000', [
          'US',
        ]),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGenres', () => {
    it('should update movie genres', async () => {
      const genre2 = (await dataSource.getRepository(GenreEntity).findOneBy({
        name: 'Drama',
      })) as GenreEntity;

      const movie = await moviesService.create(createMovieDto());

      await moviesService.updateGenres(movie.id, [genre.id, genre2.id]);

      const updated = await moviesService.getMovieById(movie.id);

      expect(updated.genres).toHaveLength(2);
      expect(updated.genres.map((g) => g.name).sort()).toEqual([
        'Action',
        'Drama',
      ]);
    });
  });

  describe('delete', () => {
    it('should soft delete movie', async () => {
      const movie = await moviesService.create(createMovieDto());

      await moviesService.delete(movie.id);

      await expect(moviesService.getMovieById(movie.id)).rejects.toThrow(
        NotFoundException,
      );

      const deletedMovie = await dataSource.getRepository(MovieEntity).findOne({
        where: { id: movie.id },
        withDeleted: true,
      });

      expect(deletedMovie).toBeDefined();
      expect(deletedMovie?.deletedAt).not.toBeNull();
    });

    it('should throw NotFoundException for non-existent movie', async () => {
      await expect(
        moviesService.delete('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
