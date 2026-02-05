import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MoviesService } from 'src/modules/movies/services/movies.service';
import { MOVIES_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { GenresService } from 'src/modules/reference/genres/genres.service';
import { CountryService } from 'src/modules/reference/country/country.service';
import { CreditsService } from 'src/modules/reference/credits/credits.service';
import { PersonsService } from 'src/modules/persons/services/persons.service';
import { MovieMapper } from 'src/modules/movies/mappers/movie.mapper';
import { CreditEntityFactory } from 'src/modules/movies/factories/credit-entity.factory';
import { MoviesMediaService } from 'src/modules/movies/services/movies-media.service';
import { AgeRating } from 'src/modules/movies/age-rating.enum';

describe('MoviesService', () => {
  let service: MoviesService;

  const moviesRepositoryMock = {
    findAll: jest.fn(),
    searchMovies: jest.fn(),
    findById: jest.fn(),
    existsBy: jest.fn(),
    findExistingMovieById: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    updateCountries: jest.fn(),
    updateGenres: jest.fn(),
    delete: jest.fn(),
    getVideoPathById: jest.fn(),
  };

  const genresServiceMock = {
    validateExists: jest.fn(),
  };

  const countryServiceMock = {
    validateExists: jest.fn(),
  };

  const creditsServiceMock = {
    validateExists: jest.fn(),
  };

  const personsServiceMock = {
    validateExists: jest.fn(),
  };

  const movieMapperMock = {
    toMovieDetailsDto: jest.fn(),
  };

  const creditEntityFactoryMock = {
    extractUniqueRoleIds: jest.fn(),
    extractUniquePersonIds: jest.fn(),
    createFromDto: jest.fn(),
  };

  const moviesMediaServiceMock = {
    resolvePosterUrl: jest.fn(),
    resolveTrailerUrl: jest.fn(),
    resolveVideoUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: MOVIES_REPOSITORY, useValue: moviesRepositoryMock },
        { provide: GenresService, useValue: genresServiceMock },
        { provide: CountryService, useValue: countryServiceMock },
        { provide: CreditsService, useValue: creditsServiceMock },
        { provide: PersonsService, useValue: personsServiceMock },
        { provide: MovieMapper, useValue: movieMapperMock },
        { provide: CreditEntityFactory, useValue: creditEntityFactoryMock },
        { provide: MoviesMediaService, useValue: moviesMediaServiceMock },
      ],
    }).compile();

    service = module.get<MoviesService>(MoviesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated movies', async () => {
      const mockMovies = [{ id: '1', title: 'Movie 1' }];
      const mockTotal = 1;
      moviesRepositoryMock.findAll.mockResolvedValue([mockMovies, mockTotal]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(moviesRepositoryMock.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result.data).toEqual(mockMovies);
      expect(result.meta.total).toBe(mockTotal);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('searchMovies', () => {
    it('should return paginated search results', async () => {
      const mockMovies = [{ id: '1', title: 'Action Movie' }];
      const mockTotal = 1;
      moviesRepositoryMock.searchMovies.mockResolvedValue([
        mockMovies,
        mockTotal,
      ]);

      const result = await service.searchMovies('Action', {
        page: 1,
        limit: 10,
      });

      expect(moviesRepositoryMock.searchMovies).toHaveBeenCalledWith('Action', {
        page: 1,
        limit: 10,
      });
      expect(result.data).toEqual(mockMovies);
    });
  });

  describe('getMovieById', () => {
    const movieId = 'movie-123';

    it('should return mapped movie details', async () => {
      const mockMovie = {
        id: movieId,
        title: 'Test Movie',
        posterPath: 'poster.jpg',
        trailerPath: 'trailer.mp4',
      };
      const mockPosterUrl = 'https://storage.example.com/poster.jpg';
      const mockTrailerUrl = 'https://storage.example.com/trailer.mp4';
      const mappedMovie = {
        id: movieId,
        title: 'Test Movie',
        posterUrl: mockPosterUrl,
        trailerUrl: mockTrailerUrl,
        directors: [],
        actors: [],
      };

      moviesRepositoryMock.findById.mockResolvedValue(mockMovie);
      moviesMediaServiceMock.resolvePosterUrl.mockReturnValue(mockPosterUrl);
      moviesMediaServiceMock.resolveTrailerUrl.mockReturnValue(mockTrailerUrl);
      movieMapperMock.toMovieDetailsDto.mockReturnValue(mappedMovie);

      const result = await service.getMovieById(movieId);

      expect(moviesRepositoryMock.findById).toHaveBeenCalledWith(movieId);
      expect(moviesMediaServiceMock.resolvePosterUrl).toHaveBeenCalledWith(
        'poster.jpg',
      );
      expect(moviesMediaServiceMock.resolveTrailerUrl).toHaveBeenCalledWith(
        'trailer.mp4',
      );
      expect(movieMapperMock.toMovieDetailsDto).toHaveBeenCalledWith(
        mockMovie,
        {
          posterUrl: mockPosterUrl,
          trailerUrl: mockTrailerUrl,
        },
      );
      expect(result).toEqual(mappedMovie);
    });

    it('should throw NotFoundException if movie not found', async () => {
      moviesRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.getMovieById(movieId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMovieVideo', () => {
    const movieId = 'movie-123';

    it('should return signed video URL', async () => {
      const videoPath = 'movies/movie-123/video.mp4';
      const signedUrl = 'https://storage.example.com/signed-video-url';

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.getVideoPathById.mockResolvedValue(videoPath);
      moviesMediaServiceMock.resolveVideoUrl.mockResolvedValue(signedUrl);

      const result = await service.getMovieVideo(movieId);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(moviesRepositoryMock.getVideoPathById).toHaveBeenCalledWith(
        movieId,
      );
      expect(moviesMediaServiceMock.resolveVideoUrl).toHaveBeenCalledWith(
        videoPath,
      );
      expect(result).toEqual({ videoUrl: signedUrl });
    });

    it('should return null when video path is null', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.getVideoPathById.mockResolvedValue(null);
      moviesMediaServiceMock.resolveVideoUrl.mockResolvedValue(null);

      const result = await service.getMovieVideo(movieId);

      expect(result).toEqual({ videoUrl: null });
    });

    it('should throw NotFoundException if movie not found', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.getMovieVideo(movieId)).rejects.toThrow(
        NotFoundException,
      );

      expect(moviesRepositoryMock.getVideoPathById).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createMovieDto = {
      title: 'New Movie',
      releaseYear: 2024,
      ageRating: AgeRating.PG_13,
      durationMinutes: 120,
      description: null,
      countryCodes: ['US'],
      genreIds: ['genre-1'],
      credits: [
        {
          personId: 'person-1',
          roles: [{ roleId: 'role-1', characterName: 'Hero', orderIndex: 1 }],
        },
      ],
    };

    it('should create a new movie', async () => {
      const mockSavedMovie = { id: 'movie-1', title: 'New Movie' };
      const creditEntities = [{ personId: 'person-1', roleId: 'role-1' }];

      moviesRepositoryMock.existsBy.mockResolvedValue(false);
      genresServiceMock.validateExists.mockResolvedValue(undefined);
      countryServiceMock.validateExists.mockResolvedValue(undefined);
      creditsServiceMock.validateExists.mockResolvedValue(undefined);
      personsServiceMock.validateExists.mockResolvedValue(undefined);
      creditEntityFactoryMock.extractUniqueRoleIds.mockReturnValue(['role-1']);
      creditEntityFactoryMock.extractUniquePersonIds.mockReturnValue([
        'person-1',
      ]);
      creditEntityFactoryMock.createFromDto.mockReturnValue(creditEntities);
      moviesRepositoryMock.save.mockResolvedValue(mockSavedMovie);

      const result = await service.create(createMovieDto);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        title: 'New Movie',
        releaseYear: 2024,
      });
      expect(genresServiceMock.validateExists).toHaveBeenCalledWith([
        'genre-1',
      ]);
      expect(countryServiceMock.validateExists).toHaveBeenCalledWith(['US']);
      expect(creditsServiceMock.validateExists).toHaveBeenCalledWith([
        'role-1',
      ]);
      expect(personsServiceMock.validateExists).toHaveBeenCalledWith([
        'person-1',
      ]);
      expect(creditEntityFactoryMock.createFromDto).toHaveBeenCalledWith(
        createMovieDto.credits,
      );
      expect(result).toEqual(mockSavedMovie);
    });

    it('should throw ConflictException if movie already exists', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);

      await expect(service.create(createMovieDto)).rejects.toThrow(
        ConflictException,
      );
      expect(moviesRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('should create movie without credits', async () => {
      const dtoWithoutCredits = { ...createMovieDto, credits: [] };
      const mockSavedMovie = { id: 'movie-1', title: 'New Movie' };

      moviesRepositoryMock.existsBy.mockResolvedValue(false);
      genresServiceMock.validateExists.mockResolvedValue(undefined);
      countryServiceMock.validateExists.mockResolvedValue(undefined);
      creditsServiceMock.validateExists.mockResolvedValue(undefined);
      personsServiceMock.validateExists.mockResolvedValue(undefined);
      creditEntityFactoryMock.extractUniqueRoleIds.mockReturnValue([]);
      creditEntityFactoryMock.extractUniquePersonIds.mockReturnValue([]);
      creditEntityFactoryMock.createFromDto.mockReturnValue([]);
      moviesRepositoryMock.save.mockResolvedValue(mockSavedMovie);

      await service.create(dtoWithoutCredits);

      expect(creditEntityFactoryMock.createFromDto).toHaveBeenCalledWith([]);
    });
  });

  describe('update', () => {
    const movieId = 'movie-123';

    it('should update movie', async () => {
      const updateDto = { title: 'Updated Title' };
      const existingMovie = { title: 'Old Title', releaseYear: 2020 };

      moviesRepositoryMock.findExistingMovieById.mockResolvedValue(
        existingMovie,
      );
      moviesRepositoryMock.existsBy.mockResolvedValue(false);
      moviesRepositoryMock.update.mockResolvedValue(undefined);

      await service.update(movieId, updateDto);

      expect(moviesRepositoryMock.findExistingMovieById).toHaveBeenCalledWith(
        movieId,
      );
      expect(moviesRepositoryMock.update).toHaveBeenCalledWith(
        movieId,
        updateDto,
      );
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.findExistingMovieById.mockResolvedValue(null);

      await expect(service.update(movieId, { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new title/year combination exists', async () => {
      const updateDto = { title: 'Existing Movie', releaseYear: 2020 };
      const existingMovie = { title: 'Old Title', releaseYear: 2019 };

      moviesRepositoryMock.findExistingMovieById.mockResolvedValue(
        existingMovie,
      );
      moviesRepositoryMock.existsBy.mockResolvedValue(true);

      await expect(service.update(movieId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should not check for duplicates if title and releaseYear unchanged', async () => {
      const updateDto = { durationMinutes: 150 };
      const existingMovie = { title: 'Movie', releaseYear: 2020 };

      moviesRepositoryMock.findExistingMovieById.mockResolvedValue(
        existingMovie,
      );
      moviesRepositoryMock.update.mockResolvedValue(undefined);

      await service.update(movieId, updateDto);

      expect(moviesRepositoryMock.existsBy).not.toHaveBeenCalled();
    });
  });

  describe('updateCountries', () => {
    const movieId = 'movie-123';
    const countryCodes = ['US', 'UK'];

    it('should update movie countries', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      countryServiceMock.validateExists.mockResolvedValue(undefined);
      moviesRepositoryMock.updateCountries.mockResolvedValue(undefined);

      await service.updateCountries(movieId, countryCodes);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(countryServiceMock.validateExists).toHaveBeenCalledWith(
        countryCodes,
      );
      expect(moviesRepositoryMock.updateCountries).toHaveBeenCalledWith(
        movieId,
        countryCodes,
      );
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(
        service.updateCountries(movieId, countryCodes),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGenres', () => {
    const movieId = 'movie-123';
    const genreIds = ['genre-1', 'genre-2'];

    it('should update movie genres', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      genresServiceMock.validateExists.mockResolvedValue(undefined);
      moviesRepositoryMock.updateGenres.mockResolvedValue(undefined);

      await service.updateGenres(movieId, genreIds);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(genresServiceMock.validateExists).toHaveBeenCalledWith(genreIds);
      expect(moviesRepositoryMock.updateGenres).toHaveBeenCalledWith(
        movieId,
        genreIds,
      );
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.updateGenres(movieId, genreIds)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    const movieId = 'movie-123';

    it('should delete movie', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.delete.mockResolvedValue(1);

      await service.delete(movieId);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(moviesRepositoryMock.delete).toHaveBeenCalledWith(movieId);
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.delete(movieId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if delete affects 0 rows', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      moviesRepositoryMock.delete.mockResolvedValue(0);

      await expect(service.delete(movieId)).rejects.toThrow(NotFoundException);
    });
  });
});
