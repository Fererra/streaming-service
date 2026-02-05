import { MovieMapper } from 'src/modules/movies/mappers/movie.mapper';
import { MovieEntity } from 'src/database/entities/movie.entity';
import { MovieCreditEntity } from 'src/database/entities/movie-credit.entity';
import { AgeRating } from 'src/modules/movies/age-rating.enum';

describe('MovieMapper', () => {
  let mapper: MovieMapper;

  beforeEach(() => {
    mapper = new MovieMapper();
  });

  const createMockCredit = (
    overrides: Partial<{
      id: string;
      roleCode: string;
      roleName: string;
      personId: string;
      firstName: string;
      lastName: string;
      photoPath: string | null;
      characterName: string | null;
      orderIndex: number | null;
    }> = {},
  ): MovieCreditEntity => {
    const defaults = {
      id: 'credit-1',
      roleCode: 'ACTOR',
      roleName: 'Actor',
      personId: 'person-1',
      firstName: 'John',
      lastName: 'Doe',
      photoPath: null,
      characterName: 'Hero',
      orderIndex: 1,
    };
    const merged = { ...defaults, ...overrides };

    return {
      id: merged.id,
      characterName: merged.characterName,
      orderIndex: merged.orderIndex,
      role: {
        id: 'role-id',
        code: merged.roleCode,
        role: merged.roleName,
      },
      person: {
        id: merged.personId,
        firstName: merged.firstName,
        lastName: merged.lastName,
        photoPath: merged.photoPath,
      },
    } as MovieCreditEntity;
  };

  const createMockMovie = (
    overrides: Partial<MovieEntity> = {},
  ): MovieEntity => {
    return {
      id: 'movie-1',
      title: 'Test Movie',
      releaseYear: 2024,
      ageRating: AgeRating.PG_13,
      durationMinutes: 120,
      genres: [{ id: 'genre-1', name: 'Action' }],
      countries: [{ code: 'US', countryName: 'United States' }],
      credits: [],
      ...overrides,
    } as MovieEntity;
  };

  describe('toMovieDetailsDto', () => {
    const defaultMedia = {
      posterUrl: 'https://example.com/poster.jpg',
      trailerUrl: null,
    };

    it('should map movie entity to details DTO', () => {
      const movie = createMockMovie();

      const result = mapper.toMovieDetailsDto(movie, defaultMedia);

      expect(result.id).toBe('movie-1');
      expect(result.title).toBe('Test Movie');
      expect(result.posterUrl).toBe('https://example.com/poster.jpg');
      expect(result.trailerUrl).toBeNull();
      expect(result.releaseYear).toBe(2024);
      expect(result.ageRating).toBe(AgeRating.PG_13);
      expect(result.durationMinutes).toBe(120);
      expect(result.genres).toEqual([{ id: 'genre-1', name: 'Action' }]);
      expect(result.countries).toEqual([
        { code: 'US', countryName: 'United States' },
      ]);
    });

    it('should map directors and actors from credits', () => {
      const movie = createMockMovie({
        credits: [
          createMockCredit({
            id: 'credit-1',
            roleCode: 'DIRECTOR',
            roleName: 'Director',
            personId: 'director-1',
            firstName: 'Steven',
            lastName: 'Spielberg',
            characterName: null,
            orderIndex: 1,
          }),
          createMockCredit({
            id: 'credit-2',
            roleCode: 'ACTOR',
            roleName: 'Actor',
            personId: 'actor-1',
            firstName: 'Tom',
            lastName: 'Hanks',
            characterName: 'Forrest',
            orderIndex: 1,
          }),
        ],
      });

      const result = mapper.toMovieDetailsDto(movie, defaultMedia);

      expect(result.directors).toHaveLength(1);
      expect(result.directors[0]).toEqual({
        id: 'director-1',
        name: 'Steven Spielberg',
        photoPath: null,
        characterName: null,
      });

      expect(result.actors).toHaveLength(1);
      expect(result.actors[0]).toEqual({
        id: 'actor-1',
        name: 'Tom Hanks',
        photoPath: null,
        characterName: 'Forrest',
      });
    });

    it('should limit directors to 2', () => {
      const movie = createMockMovie({
        credits: [
          createMockCredit({
            roleCode: 'DIRECTOR',
            personId: 'd1',
            orderIndex: 1,
          }),
          createMockCredit({
            roleCode: 'DIRECTOR',
            personId: 'd2',
            orderIndex: 2,
          }),
          createMockCredit({
            roleCode: 'DIRECTOR',
            personId: 'd3',
            orderIndex: 3,
          }),
        ],
      });

      const result = mapper.toMovieDetailsDto(movie, defaultMedia);

      expect(result.directors).toHaveLength(2);
    });

    it('should limit actors to 20', () => {
      const credits = Array.from({ length: 25 }, (_, i) =>
        createMockCredit({
          id: `credit-${i}`,
          roleCode: 'ACTOR',
          personId: `actor-${i}`,
          orderIndex: i,
        }),
      );

      const movie = createMockMovie({ credits });

      const result = mapper.toMovieDetailsDto(movie, defaultMedia);

      expect(result.actors).toHaveLength(20);
    });

    it('should sort credits by orderIndex', () => {
      const movie = createMockMovie({
        credits: [
          createMockCredit({
            roleCode: 'ACTOR',
            personId: 'a3',
            firstName: 'Third',
            orderIndex: 3,
          }),
          createMockCredit({
            roleCode: 'ACTOR',
            personId: 'a1',
            firstName: 'First',
            orderIndex: 1,
          }),
          createMockCredit({
            roleCode: 'ACTOR',
            personId: 'a2',
            firstName: 'Second',
            orderIndex: 2,
          }),
        ],
      });

      const result = mapper.toMovieDetailsDto(movie, defaultMedia);

      expect(result.actors[0].name).toContain('First');
      expect(result.actors[1].name).toContain('Second');
      expect(result.actors[2].name).toContain('Third');
    });

    it('should ignore roles that are not DIRECTOR or ACTOR', () => {
      const movie = createMockMovie({
        credits: [
          createMockCredit({ roleCode: 'PRODUCER', personId: 'p1' }),
          createMockCredit({ roleCode: 'WRITER', personId: 'w1' }),
          createMockCredit({ roleCode: 'ACTOR', personId: 'a1' }),
        ],
      });

      const result = mapper.toMovieDetailsDto(movie, defaultMedia);

      expect(result.directors).toHaveLength(0);
      expect(result.actors).toHaveLength(1);
    });

    it('should return empty arrays for no credits', () => {
      const movie = createMockMovie({ credits: [] });

      const result = mapper.toMovieDetailsDto(movie, defaultMedia);

      expect(result.directors).toEqual([]);
      expect(result.actors).toEqual([]);
    });
  });

  describe('toMovieCreditsDto', () => {
    it('should group credits by role', () => {
      const credits = [
        createMockCredit({
          roleCode: 'DIRECTOR',
          personId: 'd1',
          firstName: 'Director',
        }),
        createMockCredit({
          roleCode: 'ACTOR',
          personId: 'a1',
          firstName: 'Actor1',
        }),
        createMockCredit({
          roleCode: 'ACTOR',
          personId: 'a2',
          firstName: 'Actor2',
        }),
      ];

      const result = mapper.toMovieCreditsDto(credits);

      expect(result).toHaveLength(2);

      const directorGroup = result.find((r) => r.role.code === 'DIRECTOR');
      const actorGroup = result.find((r) => r.role.code === 'ACTOR');

      expect(directorGroup?.people).toHaveLength(1);
      expect(actorGroup?.people).toHaveLength(2);
    });

    it('should group multiple roles for the same person', () => {
      const credits = [
        createMockCredit({
          id: 'credit-1',
          roleCode: 'ACTOR',
          personId: 'person-1',
          firstName: 'John',
          lastName: 'Doe',
          characterName: 'Character 1',
          orderIndex: 1,
        }),
        createMockCredit({
          id: 'credit-2',
          roleCode: 'ACTOR',
          personId: 'person-1',
          firstName: 'John',
          lastName: 'Doe',
          characterName: 'Character 2',
          orderIndex: 2,
        }),
      ];

      const result = mapper.toMovieCreditsDto(credits);

      expect(result).toHaveLength(1);
      expect(result[0].people).toHaveLength(1);
      expect(result[0].people[0].roles).toHaveLength(2);
      expect(result[0].people[0].roles[0].characterName).toBe('Character 1');
      expect(result[0].people[0].roles[1].characterName).toBe('Character 2');
    });

    it('should format person name correctly', () => {
      const credits = [
        createMockCredit({
          personId: 'p1',
          firstName: 'Robert',
          lastName: 'De Niro',
        }),
      ];

      const result = mapper.toMovieCreditsDto(credits);

      expect(result[0].people[0].person.name).toBe('Robert De Niro');
    });

    it('should include role details', () => {
      const credits = [
        createMockCredit({
          id: 'credit-1',
          roleCode: 'ACTOR',
          roleName: 'Actor',
          characterName: 'Tony Montana',
          orderIndex: 5,
        }),
      ];

      const result = mapper.toMovieCreditsDto(credits);

      expect(result[0].role).toEqual({ code: 'ACTOR', name: 'Actor' });
      expect(result[0].people[0].roles[0]).toEqual({
        creditId: 'credit-1',
        characterName: 'Tony Montana',
        orderIndex: 5,
      });
    });

    it('should return empty array for empty credits', () => {
      const result = mapper.toMovieCreditsDto([]);

      expect(result).toEqual([]);
    });
  });
});
