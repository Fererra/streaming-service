import { Test, TestingModule } from '@nestjs/testing';
import { GenresController } from 'src/modules/reference/genres/genres.controller';
import { GenresService } from 'src/modules/reference/genres/genres.service';

describe('GenresController', () => {
  let controller: GenresController;

  const genresServiceMock = {
    getAllGenres: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenresController],
      providers: [
        {
          provide: GenresService,
          useValue: genresServiceMock,
        },
      ],
    }).compile();

    controller = module.get<GenresController>(GenresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllGenres', () => {
    it('should return all genres', async () => {
      const result = [
        { id: 'uuid-1', name: 'Action' },
        { id: 'uuid-2', name: 'Comedy' },
      ];

      genresServiceMock.getAllGenres.mockResolvedValue(result);

      const genres = await controller.getAllGenres();

      expect(genresServiceMock.getAllGenres).toHaveBeenCalled();
      expect(genres).toEqual(result);
    });
  });
});
