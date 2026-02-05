import { Test, TestingModule } from '@nestjs/testing';
import { PersonsController } from '../../src/modules/persons/persons.controller';
import { PersonsService } from '../../src/modules/persons/services/persons.service';

describe('PersonsController', () => {
  let controller: PersonsController;

  const personsServiceMock = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonsController],
      providers: [{ provide: PersonsService, useValue: personsServiceMock }],
    }).compile();

    controller = module.get<PersonsController>(PersonsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllPersons', () => {
    it('should return all persons', async () => {
      const result = { data: [{ id: '1' }, { id: '2' }], meta: { total: 2 } };
      personsServiceMock.findAll.mockResolvedValue(result);

      const persons = await controller.getAllPersons({ page: 1, limit: 10 });

      expect(personsServiceMock.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
        },
        undefined,
      );
      expect(persons).toEqual(result);
    });

    it('should return persons with search query', async () => {
      const result = { data: [{ id: '1' }], meta: { total: 1 } };
      personsServiceMock.findAll.mockResolvedValue(result);

      const persons = await controller.getAllPersons({
        page: 1,
        limit: 10,
        search: 'John',
      });

      expect(personsServiceMock.findAll).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
        },
        'John',
      );
      expect(persons).toEqual(result);
    });
  });
});
