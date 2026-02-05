import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MoviesCreditsService } from 'src/modules/movies/services/movies-credits.service';
import {
  MOVIE_CREDITS_REPOSITORY,
  MOVIES_REPOSITORY,
} from 'src/database/repositories/tokens/repository.tokens';
import { CreditsService } from 'src/modules/reference/credits/credits.service';
import { PersonsService } from 'src/modules/persons/services/persons.service';
import { MovieMapper } from 'src/modules/movies/mappers/movie.mapper';
import { CreditEntityFactory } from 'src/modules/movies/factories/credit-entity.factory';
import { CreateCreditsDto } from 'src/modules/movies/dto/create-movie.dto';

describe('MoviesCreditsService', () => {
  let service: MoviesCreditsService;

  const moviesRepositoryMock = {
    existsBy: jest.fn(),
  };

  const movieCreditsRepositoryMock = {
    getMovieCredits: jest.fn(),
    addCredits: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const creditsServiceMock = {
    validateExists: jest.fn(),
  };

  const personsServiceMock = {
    validateExists: jest.fn(),
  };

  const movieMapperMock = {
    toMovieCreditsDto: jest.fn(),
  };

  const creditEntityFactoryMock = {
    extractUniqueRoleIds: jest.fn(),
    extractUniquePersonIds: jest.fn(),
    createFromDto: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoviesCreditsService,
        { provide: MOVIES_REPOSITORY, useValue: moviesRepositoryMock },
        {
          provide: MOVIE_CREDITS_REPOSITORY,
          useValue: movieCreditsRepositoryMock,
        },
        { provide: CreditsService, useValue: creditsServiceMock },
        { provide: PersonsService, useValue: personsServiceMock },
        { provide: MovieMapper, useValue: movieMapperMock },
        { provide: CreditEntityFactory, useValue: creditEntityFactoryMock },
      ],
    }).compile();

    service = module.get<MoviesCreditsService>(MoviesCreditsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMovieCredits', () => {
    const movieId = 'movie-123';

    it('should return movie credits', async () => {
      const mockCredits = [{ id: 'credit-1' }];
      const mappedCredits = [{ role: { code: 'ACTOR' }, people: [] }];

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      movieCreditsRepositoryMock.getMovieCredits.mockResolvedValue(mockCredits);
      movieMapperMock.toMovieCreditsDto.mockReturnValue(mappedCredits);

      const result = await service.getMovieCredits(movieId);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(movieCreditsRepositoryMock.getMovieCredits).toHaveBeenCalledWith(
        movieId,
      );
      expect(movieMapperMock.toMovieCreditsDto).toHaveBeenCalledWith(
        mockCredits,
      );
      expect(result).toEqual(mappedCredits);
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.getMovieCredits(movieId)).rejects.toThrow(
        NotFoundException,
      );
      expect(movieCreditsRepositoryMock.getMovieCredits).not.toHaveBeenCalled();
    });
  });

  describe('addCredits', () => {
    const movieId = 'movie-123';
    const createCreditsDto: CreateCreditsDto[] = [
      {
        personId: 'person-1',
        roles: [{ roleId: 'role-1', characterName: 'Hero', orderIndex: 1 }],
      },
    ];

    it('should add credits to movie', async () => {
      const mockCreditEntities = [
        { movieId, personId: 'person-1', roleId: 'role-1' },
      ];

      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      creditEntityFactoryMock.extractUniqueRoleIds.mockReturnValue(['role-1']);
      creditEntityFactoryMock.extractUniquePersonIds.mockReturnValue([
        'person-1',
      ]);
      creditsServiceMock.validateExists.mockResolvedValue(undefined);
      personsServiceMock.validateExists.mockResolvedValue(undefined);
      creditEntityFactoryMock.createFromDto.mockReturnValue(mockCreditEntities);
      movieCreditsRepositoryMock.addCredits.mockResolvedValue(undefined);

      await service.addCredits(movieId, createCreditsDto);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(creditEntityFactoryMock.extractUniqueRoleIds).toHaveBeenCalledWith(
        createCreditsDto,
      );
      expect(
        creditEntityFactoryMock.extractUniquePersonIds,
      ).toHaveBeenCalledWith(createCreditsDto);
      expect(creditsServiceMock.validateExists).toHaveBeenCalledWith([
        'role-1',
      ]);
      expect(personsServiceMock.validateExists).toHaveBeenCalledWith([
        'person-1',
      ]);
      expect(creditEntityFactoryMock.createFromDto).toHaveBeenCalledWith(
        createCreditsDto,
        movieId,
      );
      expect(movieCreditsRepositoryMock.addCredits).toHaveBeenCalledWith(
        mockCreditEntities,
      );
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(
        service.addCredits(movieId, createCreditsDto),
      ).rejects.toThrow(NotFoundException);
      expect(movieCreditsRepositoryMock.addCredits).not.toHaveBeenCalled();
    });
  });

  describe('updateCredit', () => {
    const movieId = 'movie-123';
    const creditId = 'credit-456';
    const updateCreditDto = { characterName: 'New Name', orderIndex: 5 };

    it('should update credit', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      movieCreditsRepositoryMock.update.mockResolvedValue(1);

      await service.updateCredit(movieId, creditId, updateCreditDto);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(movieCreditsRepositoryMock.update).toHaveBeenCalledWith(
        creditId,
        movieId,
        updateCreditDto,
      );
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(
        service.updateCredit(movieId, creditId, updateCreditDto),
      ).rejects.toThrow(NotFoundException);
      expect(movieCreditsRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if credit does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      movieCreditsRepositoryMock.update.mockResolvedValue(0);

      await expect(
        service.updateCredit(movieId, creditId, updateCreditDto),
      ).rejects.toThrow(
        new NotFoundException('Credit does not exist for this movie.'),
      );
    });
  });

  describe('deleteCredit', () => {
    const movieId = 'movie-123';
    const creditId = 'credit-456';

    it('should delete credit', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      movieCreditsRepositoryMock.delete.mockResolvedValue(1);

      await service.deleteCredit(movieId, creditId);

      expect(moviesRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: movieId,
      });
      expect(movieCreditsRepositoryMock.delete).toHaveBeenCalledWith(
        creditId,
        movieId,
      );
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(service.deleteCredit(movieId, creditId)).rejects.toThrow(
        NotFoundException,
      );
      expect(movieCreditsRepositoryMock.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if credit does not exist', async () => {
      moviesRepositoryMock.existsBy.mockResolvedValue(true);
      movieCreditsRepositoryMock.delete.mockResolvedValue(0);

      await expect(service.deleteCredit(movieId, creditId)).rejects.toThrow(
        new NotFoundException('Credit does not exist for this movie.'),
      );
    });
  });
});
