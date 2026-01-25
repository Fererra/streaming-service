import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminPersonsController } from 'src/modules/admin/admin-persons.controller';
import { JwtGuard } from 'src/modules/auth/jwt.guard';
import { RolesGuard } from 'src/modules/auth/roles.guard';
import { CreatePersonDto } from 'src/modules/persons/dto/create-person.dto';
import { UpdatePersonDto } from 'src/modules/persons/dto/update-person.dto';
import { PersonsService } from 'src/modules/persons/persons.service';

describe('AdminPersonsController', () => {
  let controller: AdminPersonsController;

  const personsServiceMock = {
    create: jest.fn(),
    update: jest.fn(),
    updatePhoto: jest.fn(),
    delete: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPersonsController],
      providers: [{ provide: PersonsService, useValue: personsServiceMock }],
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
    it('should update person photo and return success message', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';
      const mockFile = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test-image-data'),
      } as Express.Multer.File;

      personsServiceMock.updatePhoto.mockResolvedValue(undefined);
      const result = await controller.updatePersonPhoto(personId, mockFile);

      expect(result).toEqual({
        message: 'Person photo updated successfully',
      });
      expect(personsServiceMock.updatePhoto).toHaveBeenCalledWith(personId, {
        buffer: mockFile.buffer,
        contentType: mockFile.mimetype,
      });
      expect(personsServiceMock.updatePhoto).toHaveBeenCalledTimes(1);
    });

    it('should handle different image types', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440000';
      const mockFile = {
        mimetype: 'image/png',
        buffer: Buffer.from('test-png-data'),
      } as Express.Multer.File;

      personsServiceMock.updatePhoto.mockResolvedValue(undefined);

      const result = await controller.updatePersonPhoto(personId, mockFile);

      expect(result).toEqual({
        message: 'Person photo updated successfully',
      });
      expect(personsServiceMock.updatePhoto).toHaveBeenCalledWith(personId, {
        buffer: mockFile.buffer,
        contentType: 'image/png',
      });
    });

    it('should throw an error if person does not exist', async () => {
      const personId = '550e8400-e29b-41d4-a716-446655440001';
      const mockFile = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test-image-data'),
      } as Express.Multer.File;

      const error = new Error('Person not found');
      personsServiceMock.updatePhoto.mockRejectedValue(error);

      await expect(
        controller.updatePersonPhoto(personId, mockFile),
      ).rejects.toThrow(error);
      expect(personsServiceMock.updatePhoto).toHaveBeenCalledWith(personId, {
        buffer: mockFile.buffer,
        contentType: mockFile.mimetype,
      });
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
