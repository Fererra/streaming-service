import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminPersonsController } from '../../src/modules/admin/admin-persons.controller';
import { JwtGuard } from '../../src/modules/auth/guards/jwt.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { CreatePersonDto } from '../../src/modules/persons/dto/create-person.dto';
import { UpdatePersonDto } from '../../src/modules/persons/dto/update-person.dto';
import { PersonsService } from '../../src/modules/persons/services/persons.service';
import { PersonsMediaService } from '../../src/modules/persons/services/persons-media.service';

describe('AdminPersonsController', () => {
  let controller: AdminPersonsController;

  const personsServiceMock = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const personsMediaServiceMock = {
    updatePhoto: jest.fn(),
    confirmPhoto: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPersonsController],
      providers: [
        { provide: PersonsService, useValue: personsServiceMock },
        { provide: PersonsMediaService, useValue: personsMediaServiceMock },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(GuardMock)
      .overrideGuard(RolesGuard)
      .useValue(GuardMock)
      .compile();

    controller = module.get<AdminPersonsController>(AdminPersonsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPerson', () => {
    it('should create a person and return success message', async () => {
      const createPersonDto: CreatePersonDto = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        country: 'US',
      };

      const mockPerson = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        ...createPersonDto,
      };

      personsServiceMock.create.mockResolvedValue(mockPerson);

      const result = await controller.createPerson(createPersonDto);

      expect(result).toEqual({
        personId: mockPerson.id,
        message: `Person ${mockPerson.firstName} ${mockPerson.lastName} created successfully`,
      });
      expect(personsServiceMock.create).toHaveBeenCalledWith(createPersonDto);
      expect(personsServiceMock.create).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from personsService.create', async () => {
      const createPersonDto: CreatePersonDto = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        country: 'invalid-uuid',
      };

      const error = new Error('Invalid country ID');
      personsServiceMock.create.mockRejectedValue(error);

      await expect(controller.createPerson(createPersonDto)).rejects.toThrow(
        error,
      );
      expect(personsServiceMock.create).toHaveBeenCalledWith(createPersonDto);
    });
  });

  describe('updatePerson', () => {
    it('should update a person and return success message', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';
      const updatePersonDto: UpdatePersonDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      personsServiceMock.update.mockResolvedValue(undefined);

      const result = await controller.updatePerson(personId, updatePersonDto);

      expect(result).toEqual({
        message: 'Person updated successfully',
      });
      expect(personsServiceMock.update).toHaveBeenCalledWith(
        personId,
        updatePersonDto,
      );
      expect(personsServiceMock.update).toHaveBeenCalledTimes(1);
    });

    it('should update only specific fields', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';
      const updatePersonDto: UpdatePersonDto = {
        firstName: 'Jane',
      };

      personsServiceMock.update.mockResolvedValue(undefined);

      const result = await controller.updatePerson(personId, updatePersonDto);

      expect(result).toEqual({
        message: 'Person updated successfully',
      });
      expect(personsServiceMock.update).toHaveBeenCalledWith(
        personId,
        updatePersonDto,
      );
    });

    it('should throw an error if person does not exist', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440001';
      const updatePersonDto: UpdatePersonDto = {
        firstName: 'Jane',
      };

      const error = new Error('Person not found');
      personsServiceMock.update.mockRejectedValue(error);

      await expect(
        controller.updatePerson(personId, updatePersonDto),
      ).rejects.toThrow(error);
      expect(personsServiceMock.update).toHaveBeenCalledWith(
        personId,
        updatePersonDto,
      );
    });
  });

  describe('updatePersonPhoto', () => {
    it('should return upload URL and storage key', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';
      const contentType = 'image/jpeg';
      const expectedResult = {
        uploadUrl: 'https://storage.example.com/signed-url',
        storageKey: 'photos/123-uuid.jpg',
      };

      personsMediaServiceMock.updatePhoto.mockResolvedValue(expectedResult);

      const result = await controller.updatePersonPhoto(personId, {
        contentType,
      });

      expect(result).toEqual(expectedResult);
      expect(personsMediaServiceMock.updatePhoto).toHaveBeenCalledWith(
        personId,
        contentType,
      );
      expect(personsMediaServiceMock.updatePhoto).toHaveBeenCalledTimes(1);
    });

    it('should handle different image types', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';
      const contentType = 'image/png';
      const expectedResult = {
        uploadUrl: 'https://storage.example.com/signed-url',
        storageKey: 'photos/123-uuid.png',
      };

      personsMediaServiceMock.updatePhoto.mockResolvedValue(expectedResult);

      const result = await controller.updatePersonPhoto(personId, {
        contentType,
      });

      expect(result).toEqual(expectedResult);
      expect(personsMediaServiceMock.updatePhoto).toHaveBeenCalledWith(
        personId,
        contentType,
      );
    });

    it('should throw an error if person does not exist', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440001';
      const contentType = 'image/jpeg';

      const error = new Error('Person not found');
      personsMediaServiceMock.updatePhoto.mockRejectedValue(error);

      await expect(
        controller.updatePersonPhoto(personId, { contentType }),
      ).rejects.toThrow(error);
      expect(personsMediaServiceMock.updatePhoto).toHaveBeenCalledWith(
        personId,
        contentType,
      );
    });
  });

  describe('confirmPhoto', () => {
    it('should confirm photo and return success message', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';
      const storageKey = 'photos/123-uuid.jpg';

      personsMediaServiceMock.confirmPhoto.mockResolvedValue(undefined);

      const result = await controller.confirmPhoto(personId, { storageKey });

      expect(result).toEqual({ message: 'Photo updated successfully' });
      expect(personsMediaServiceMock.confirmPhoto).toHaveBeenCalledWith(
        personId,
        storageKey,
      );
    });

    it('should throw an error if intent is invalid', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';
      const storageKey = 'photos/invalid-key.jpg';

      const error = new Error('No valid upload intent found');
      personsMediaServiceMock.confirmPhoto.mockRejectedValue(error);

      await expect(
        controller.confirmPhoto(personId, { storageKey }),
      ).rejects.toThrow(error);
    });
  });

  describe('deletePerson', () => {
    it('should delete a person and return success message', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';

      personsServiceMock.delete.mockResolvedValue(undefined);

      const result = await controller.deletePerson(personId);

      expect(result).toEqual({
        message: 'Person deleted successfully',
      });
      expect(personsServiceMock.delete).toHaveBeenCalledWith(personId);
      expect(personsServiceMock.delete).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if person does not exist', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440001';

      const error = new Error('Person not found');
      personsServiceMock.delete.mockRejectedValue(error);

      await expect(controller.deletePerson(personId)).rejects.toThrow(error);
      expect(personsServiceMock.delete).toHaveBeenCalledWith(personId);
    });

    it('should throw an error if person has dependencies', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';

      const error = new Error(
        'Cannot delete person with existing dependencies',
      );
      personsServiceMock.delete.mockRejectedValue(error);

      await expect(controller.deletePerson(personId)).rejects.toThrow(error);
      expect(personsServiceMock.delete).toHaveBeenCalledWith(personId);
    });
  });
});
