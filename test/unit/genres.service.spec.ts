import { Test, TestingModule } from '@nestjs/testing';
import { GenresService } from 'src/modules/genres/genres.service';
import { GENRES_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';

describe('GenresService', () => {
  let service: GenresService;

  const genresRepositoryMock = {
    getAllGenres: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenresService,
        { provide: GENRES_REPOSITORY, useValue: genresRepositoryMock },
      ],
    }).compile();

    service = module.get<GenresService>(GenresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve all genres', async () => {
    const mockGenres = [
      { id: 'uuid-1', name: 'Action' },
      { id: 'uuid-2', name: 'Comedy' },
    ];

    genresRepositoryMock.getAllGenres.mockResolvedValue(mockGenres);

    const result = await service.getAllGenres();

    expect(genresRepositoryMock.getAllGenres).toHaveBeenCalled();
    expect(result).toEqual(mockGenres);
  });
});
