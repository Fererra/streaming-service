import { Test, TestingModule } from '@nestjs/testing';
import { AdminMoviesController } from 'src/modules/admin/admin-movies.controller';
import { MoviesService } from 'src/modules/movies/services/movies.service';
import { MoviesMediaService } from 'src/modules/movies/services/movies-media.service';
import { MoviesCreditsService } from 'src/modules/movies/services/movies-credits.service';
import { AgeRating } from 'src/modules/movies/age-rating.enum';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

describe('AdminMoviesController', () => {
  let controller: AdminMoviesController;

  const moviesServiceMock = {
    create: jest.fn(),
    update: jest.fn(),
    updateCountries: jest.fn(),
    updateGenres: jest.fn(),
    delete: jest.fn(),
  };

  const moviesMediaServiceMock = {
    updatePoster: jest.fn(),
    confirmPoster: jest.fn(),
    uploadTrailer: jest.fn(),
    confirmTrailer: jest.fn(),
    uploadVideo: jest.fn(),
    confirmVideo: jest.fn(),
  };

  const moviesCreditsServiceMock = {
    addCredits: jest.fn(),
    updateCredit: jest.fn(),
    deleteCredit: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMoviesController],
      providers: [
        { provide: MoviesService, useValue: moviesServiceMock },
        { provide: MoviesMediaService, useValue: moviesMediaServiceMock },
        { provide: MoviesCreditsService, useValue: moviesCreditsServiceMock },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(GuardMock)
      .overrideGuard(RolesGuard)
      .useValue(GuardMock)
      .compile();

    controller = module.get<AdminMoviesController>(AdminMoviesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createMovie', () => {
    it('should create a movie and return movieId with message', async () => {
      const createMovieDto = {
        title: 'Test Movie',
        releaseYear: 2024,
        ageRating: AgeRating.PG_13,
        durationMinutes: 120,
        description: 'A test movie description',
        countryCodes: ['US'],
        genreIds: ['genre-uuid-1', 'genre-uuid-2'],
        credits: [],
      };

      const mockMovie = { id: 'movie-123', title: 'Test Movie' };
      moviesServiceMock.create.mockResolvedValue(mockMovie);

      const result = await controller.createMovie(createMovieDto);

      expect(moviesServiceMock.create).toHaveBeenCalledWith(createMovieDto);
      expect(result).toEqual({
        movieId: 'movie-123',
        message: 'Movie Test Movie created successfully',
      });
    });
  });

  describe('updateMoviePoster', () => {
    it('should return upload URL and storage key', async () => {
      const mockResponse = {
        uploadUrl: 'https://storage.example.com/signed-url',
        storageKey: 'posters/123-uuid.jpg',
      };
      moviesMediaServiceMock.updatePoster.mockResolvedValue(mockResponse);

      const result = await controller.updateMoviePoster('movie-123', {
        contentType: 'image/jpeg',
      });

      expect(moviesMediaServiceMock.updatePoster).toHaveBeenCalledWith(
        'movie-123',
        'image/jpeg',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('confirmPoster', () => {
    it('should confirm poster upload and return success message', async () => {
      moviesMediaServiceMock.confirmPoster.mockResolvedValue(undefined);

      const result = await controller.confirmPoster('movie-123', {
        storageKey: 'posters/123-uuid.jpg',
      });

      expect(moviesMediaServiceMock.confirmPoster).toHaveBeenCalledWith(
        'movie-123',
        'posters/123-uuid.jpg',
      );
      expect(result).toEqual({ message: 'Movie poster updated successfully' });
    });
  });

  describe('updateMovieTrailer', () => {
    it('should return upload URL and storage key for trailer', async () => {
      const mockResponse = {
        uploadUrl: 'https://storage.example.com/signed-url',
        storageKey: 'movies/movie-123/trailer.mp4',
      };
      moviesMediaServiceMock.uploadTrailer.mockResolvedValue(mockResponse);

      const result = await controller.updateMovieTrailer('movie-123', {
        contentType: 'video/mp4',
      });

      expect(moviesMediaServiceMock.uploadTrailer).toHaveBeenCalledWith(
        'movie-123',
        'video/mp4',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('confirmTrailer', () => {
    it('should confirm trailer upload and return success message', async () => {
      moviesMediaServiceMock.confirmTrailer.mockResolvedValue(undefined);

      const result = await controller.confirmTrailer('movie-123', {
        storageKey: 'movies/movie-123/trailer.mp4',
      });

      expect(moviesMediaServiceMock.confirmTrailer).toHaveBeenCalledWith(
        'movie-123',
        'movies/movie-123/trailer.mp4',
      );
      expect(result).toEqual({ message: 'Movie trailer updated successfully' });
    });
  });

  describe('updateMovieVideo', () => {
    it('should return upload URL and storage key for video', async () => {
      const mockResponse = {
        uploadUrl: 'https://storage.example.com/signed-url',
        storageKey: 'movies/movie-123/video.mp4',
      };
      moviesMediaServiceMock.uploadVideo.mockResolvedValue(mockResponse);

      const result = await controller.updateMovieVideo('movie-123', {
        contentType: 'video/mp4',
      });

      expect(moviesMediaServiceMock.uploadVideo).toHaveBeenCalledWith(
        'movie-123',
        'video/mp4',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('confirmVideo', () => {
    it('should confirm video upload and return success message', async () => {
      moviesMediaServiceMock.confirmVideo.mockResolvedValue(undefined);

      const result = await controller.confirmVideo('movie-123', {
        storageKey: 'movies/movie-123/video.mp4',
      });

      expect(moviesMediaServiceMock.confirmVideo).toHaveBeenCalledWith(
        'movie-123',
        'movies/movie-123/video.mp4',
      );
      expect(result).toEqual({ message: 'Movie video updated successfully' });
    });
  });

  describe('updateMovie', () => {
    it('should update movie and return success message', async () => {
      moviesServiceMock.update.mockResolvedValue(undefined);

      const updateDto = { title: 'Updated Title', durationMinutes: 150 };
      const result = await controller.updateMovie('movie-123', updateDto);

      expect(moviesServiceMock.update).toHaveBeenCalledWith(
        'movie-123',
        updateDto,
      );
      expect(result).toEqual({ message: 'Movie updated successfully' });
    });
  });

  describe('updateMovieCountries', () => {
    it('should update movie countries and return success message', async () => {
      moviesServiceMock.updateCountries.mockResolvedValue(undefined);

      const result = await controller.updateMovieCountries('movie-123', {
        countryCodes: ['US', 'UK'],
      });

      expect(moviesServiceMock.updateCountries).toHaveBeenCalledWith(
        'movie-123',
        ['US', 'UK'],
      );
      expect(result).toEqual({
        message: 'Movie countries updated successfully',
      });
    });
  });

  describe('updateMovieGenres', () => {
    it('should update movie genres and return success message', async () => {
      moviesServiceMock.updateGenres.mockResolvedValue(undefined);

      const result = await controller.updateMovieGenres('movie-123', {
        genreIds: ['genre-1', 'genre-2', 'genre-3'],
      });

      expect(moviesServiceMock.updateGenres).toHaveBeenCalledWith('movie-123', [
        'genre-1',
        'genre-2',
        'genre-3',
      ]);
      expect(result).toEqual({ message: 'Movie genres updated successfully' });
    });
  });

  describe('addMovieCredits', () => {
    it('should add movie credits and return success message', async () => {
      moviesCreditsServiceMock.addCredits.mockResolvedValue(undefined);

      const creditsDto = [
        {
          personId: 'person-1',
          roles: [
            { roleId: 'role-uuid-1', characterName: 'Hero', orderIndex: 1 },
          ],
        },
      ];
      const result = await controller.addMovieCredits('movie-123', creditsDto);

      expect(moviesCreditsServiceMock.addCredits).toHaveBeenCalledWith(
        'movie-123',
        creditsDto,
      );
      expect(result).toEqual({ message: 'Movie credits added successfully' });
    });
  });

  describe('updateMovieCredits', () => {
    it('should update movie credit and return success message', async () => {
      moviesCreditsServiceMock.updateCredit.mockResolvedValue(undefined);

      const updateCreditDto = { characterName: 'Updated Name', orderIndex: 5 };
      const result = await controller.updateMovieCredits(
        'movie-123',
        'credit-456',
        updateCreditDto,
      );

      expect(moviesCreditsServiceMock.updateCredit).toHaveBeenCalledWith(
        'movie-123',
        'credit-456',
        updateCreditDto,
      );
      expect(result).toEqual({ message: 'Movie credit updated successfully' });
    });
  });

  describe('deleteMovie', () => {
    it('should delete movie and return success message', async () => {
      moviesServiceMock.delete.mockResolvedValue(undefined);

      const result = await controller.deleteMovie('movie-123');

      expect(moviesServiceMock.delete).toHaveBeenCalledWith('movie-123');
      expect(result).toEqual({ message: 'Movie deleted successfully' });
    });
  });

  describe('deleteMovieCredits', () => {
    it('should delete movie credit and return success message', async () => {
      moviesCreditsServiceMock.deleteCredit.mockResolvedValue(undefined);

      const result = await controller.deleteMovieCredits(
        'movie-123',
        'credit-456',
      );

      expect(moviesCreditsServiceMock.deleteCredit).toHaveBeenCalledWith(
        'movie-123',
        'credit-456',
      );
      expect(result).toEqual({ message: 'Movie credit deleted successfully' });
    });
  });
});
