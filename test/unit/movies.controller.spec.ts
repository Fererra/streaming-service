import { Test, TestingModule } from '@nestjs/testing';
import { MoviesController } from 'src/modules/movies/movies.controller';
import { MoviesService } from 'src/modules/movies/services/movies.service';
import { MoviesCreditsService } from 'src/modules/movies/services/movies-credits.service';
import { AgeRating } from 'src/modules/movies/age-rating.enum';

describe('MoviesController', () => {
  let controller: MoviesController;

  const moviesServiceMock = {
    findAll: jest.fn(),
    searchMovies: jest.fn(),
    getMovieById: jest.fn(),
    getMovieVideo: jest.fn(),
  };

  const movieCreditsServiceMock = {
    getMovieCredits: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        { provide: MoviesService, useValue: moviesServiceMock },
        { provide: MoviesCreditsService, useValue: movieCreditsServiceMock },
      ],
    }).compile();

    controller = module.get<MoviesController>(MoviesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllMovies', () => {
    it('should return paginated movies', async () => {
      const mockResponse = {
        data: [{ id: '1', title: 'Movie 1' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      moviesServiceMock.findAll.mockResolvedValue(mockResponse);

      const result = await controller.getAllMovies({ page: 1, limit: 10 });

      expect(moviesServiceMock.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('searchMovies', () => {
    it('should return search results', async () => {
      const mockResponse = {
        data: [{ id: '1', title: 'Action Movie' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      moviesServiceMock.searchMovies.mockResolvedValue(mockResponse);

      const result = await controller.searchMovies({
        title: 'Action',
        page: 1,
        limit: 10,
      });

      expect(moviesServiceMock.searchMovies).toHaveBeenCalledWith('Action', {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMovieById', () => {
    it('should return movie details', async () => {
      const mockMovie = {
        id: 'movie-1',
        title: 'Test Movie',
        releaseYear: 2024,
        ageRating: AgeRating.PG13,
        durationMinutes: 120,
        genres: [],
        countries: [],
        directors: [],
        actors: [],
      };
      moviesServiceMock.getMovieById.mockResolvedValue(mockMovie);

      const result = await controller.getMovieById('movie-1');

      expect(moviesServiceMock.getMovieById).toHaveBeenCalledWith('movie-1');
      expect(result).toEqual(mockMovie);
    });
  });

  describe('getMovieVideo', () => {
    it('should return signed video URL', async () => {
      const signedUrl = 'https://storage.example.com/signed-video-url';
      moviesServiceMock.getMovieVideo.mockResolvedValue(signedUrl);

      const result = await controller.getMovieVideo('movie-1');

      expect(moviesServiceMock.getMovieVideo).toHaveBeenCalledWith('movie-1');
      expect(result).toBe(signedUrl);
    });

    it('should return null when no video available', async () => {
      moviesServiceMock.getMovieVideo.mockResolvedValue(null);

      const result = await controller.getMovieVideo('movie-1');

      expect(moviesServiceMock.getMovieVideo).toHaveBeenCalledWith('movie-1');
      expect(result).toBeNull();
    });
  });

  describe('getMovieCredits', () => {
    it('should return movie credits', async () => {
      const mockCredits = [
        {
          role: { code: 'ACTOR', name: 'Actor' },
          people: [
            {
              person: { id: 'p1', name: 'John Doe', photoPath: null },
              roles: [{ creditId: 'c1', characterName: 'Hero', orderIndex: 1 }],
            },
          ],
        },
      ];
      movieCreditsServiceMock.getMovieCredits.mockResolvedValue(mockCredits);

      const result = await controller.getMovieCredits('movie-1');

      expect(movieCreditsServiceMock.getMovieCredits).toHaveBeenCalledWith(
        'movie-1',
      );
      expect(result).toEqual(mockCredits);
    });
  });
});
