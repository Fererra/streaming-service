import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PERSONS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { PersonsService } from 'src/modules/persons/persons.service';
import { IMAGE_STORAGE } from 'src/modules/storage/storage.token';
import { ImageStoragePath } from 'src/modules/storage/storage-path.enum';

describe('PersonsService', () => {
  let service: PersonsService;

  const personsRepositoryMock = {
    findAll: jest.fn(),
    existsById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findPhotoPathById: jest.fn(),
  };

  const imageStorageMock = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonsService,
        { provide: PERSONS_REPOSITORY, useValue: personsRepositoryMock },
        { provide: IMAGE_STORAGE, useValue: imageStorageMock },
      ],
    }).compile();

    service = module.get<PersonsService>(PersonsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should find all persons with pagination', async () => {
      const mockPersons = [{ id: '1' }, { id: '2' }];
      const mockTotal = 2;
      personsRepositoryMock.findAll.mockResolvedValue([mockPersons, mockTotal]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(personsRepositoryMock.findAll).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        undefined,
      );
      expect(result.data).toEqual(mockPersons);
      expect(result.meta.total).toEqual(mockTotal);
    });

    it('should find all persons with pagination and search', async () => {
      const mockPersons = [{ id: '1', firstName: 'John' }];
      const mockTotal = 1;
      personsRepositoryMock.findAll.mockResolvedValue([mockPersons, mockTotal]);

      const result = await service.findAll({ page: 1, limit: 10 }, 'John');

      expect(personsRepositoryMock.findAll).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        'John',
      );
      expect(result.data).toEqual(mockPersons);
      expect(result.meta.total).toEqual(mockTotal);
    });
  });

  describe('create', () => {
    it('should create a new person', async () => {
      const createPersonDto = {
        firstName: 'John',
        lastName: 'Doe',
        country: 'US',
        dateOfBirth: new Date('1990-01-01'),
      };

      const mockPerson = {
        id: '1',
        firstName: 'John',
        country: { code: 'US' },
        dateOfBirth: new Date('1990-01-01'),
      };

      personsRepositoryMock.create.mockResolvedValue(mockPerson);

      const result = await service.create(createPersonDto);

      expect(personsRepositoryMock.create).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        country: { code: 'US' },
        dateOfBirth: new Date('1990-01-01'),
      });
      expect(result).toEqual(mockPerson);
    });
  });

  describe('update', () => {
    it('should update an existing person with all fields', async () => {
      const personId = '1';
      const updatePersonDto = {
        firstName: 'Jane',
        dateOfBirth: new Date('1995-05-15'),
        country: 'GB',
      };
      personsRepositoryMock.existsById.mockResolvedValue(true);

      await service.update(personId, updatePersonDto);

      expect(personsRepositoryMock.existsById).toHaveBeenCalledWith(personId);
      expect(personsRepositoryMock.update).toHaveBeenCalledWith(personId, {
        firstName: 'Jane',
        dateOfBirth: new Date('1995-05-15'),
        country: { code: 'GB' },
      });
    });

    it('should update only provided fields', async () => {
      const personId = '1';
      const updatePersonDto = { firstName: 'Jane' };
      personsRepositoryMock.existsById.mockResolvedValue(true);

      await service.update(personId, updatePersonDto);

      expect(personsRepositoryMock.existsById).toHaveBeenCalledWith(personId);
      expect(personsRepositoryMock.update).toHaveBeenCalledWith(personId, {
        firstName: 'Jane',
      });
    });

    it('should throw NotFoundException when updating non-existing person', async () => {
      const personId = '1';
      const updatePersonDto = { firstName: 'Jane' };
      personsRepositoryMock.existsById.mockResolvedValue(false);

      await expect(service.update(personId, updatePersonDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(personsRepositoryMock.existsById).toHaveBeenCalledWith(personId);
      expect(personsRepositoryMock.update).not.toHaveBeenCalled();
    });
  });

  describe('updatePhoto', () => {
    it('should update photo for an existing person', async () => {
      const personId = '1';
      const photoInput = {
        buffer: Buffer.from('test'),
        contentType: 'image/jpeg',
        originalName: 'photo.jpg',
      };
      const oldPhotoPath = 'old/photo.jpg';
      const newStorageKey = 'new/photo.jpg';

      personsRepositoryMock.existsById.mockResolvedValue(true);
      personsRepositoryMock.findPhotoPathById.mockResolvedValue(oldPhotoPath);
      imageStorageMock.upload.mockResolvedValue({ storageKey: newStorageKey });
      personsRepositoryMock.update.mockResolvedValue(undefined);

      await service.updatePhoto(personId, photoInput);

      expect(personsRepositoryMock.findPhotoPathById).toHaveBeenCalledWith(
        personId,
      );
      expect(imageStorageMock.upload).toHaveBeenCalledWith(photoInput, {
        path: ImageStoragePath.PERSON_PHOTOS,
        extension: 'jpg',
        isPublic: true,
      });
      expect(personsRepositoryMock.update).toHaveBeenCalledWith(personId, {
        photoPath: newStorageKey,
      });
      expect(imageStorageMock.delete).toHaveBeenCalledWith(oldPhotoPath, true);
    });

    it('should update photo without deleting old one if not exists', async () => {
      const personId = '1';
      const photoInput = {
        buffer: Buffer.from('test'),
        contentType: 'image/jpeg',
        originalName: 'photo.jpg',
      };
      const newStorageKey = 'new/photo.jpg';

      personsRepositoryMock.existsById.mockResolvedValue(true);
      personsRepositoryMock.findPhotoPathById.mockResolvedValue(null);
      imageStorageMock.upload.mockResolvedValue({ storageKey: newStorageKey });
      personsRepositoryMock.update.mockResolvedValue(undefined);

      await service.updatePhoto(personId, photoInput);

      expect(personsRepositoryMock.findPhotoPathById).toHaveBeenCalledWith(
        personId,
      );
      expect(imageStorageMock.upload).toHaveBeenCalledWith(photoInput, {
        path: ImageStoragePath.PERSON_PHOTOS,
        extension: 'jpg',
        isPublic: true,
      });
      expect(personsRepositoryMock.update).toHaveBeenCalledWith(personId, {
        photoPath: newStorageKey,
      });
      expect(imageStorageMock.delete).toHaveBeenCalledTimes(0);
    });

    it('should throw NotFoundException when person does not exist', async () => {
      const personId = '1';
      const photoInput = {
        buffer: Buffer.from('test'),
        contentType: 'image/jpeg',
        originalName: 'photo.jpg',
      };
      personsRepositoryMock.existsById.mockResolvedValue(false);

      await expect(service.updatePhoto(personId, photoInput)).rejects.toThrow(
        NotFoundException,
      );

      expect(personsRepositoryMock.findPhotoPathById).not.toHaveBeenCalled();
      expect(imageStorageMock.upload).not.toHaveBeenCalled();
      expect(personsRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should delete uploaded photo if update fails', async () => {
      const personId = '1';
      const photoInput = {
        buffer: Buffer.from('test'),
        contentType: 'image/jpeg',
        originalName: 'photo.jpg',
      };
      const oldPhotoPath = 'old/photo.jpg';
      const newStorageKey = 'new/photo.jpg';
      const updateError = new Error('Update failed');

      personsRepositoryMock.existsById.mockResolvedValue(true);
      personsRepositoryMock.findPhotoPathById.mockResolvedValue(oldPhotoPath);
      imageStorageMock.upload.mockResolvedValue({ storageKey: newStorageKey });
      personsRepositoryMock.update.mockRejectedValue(updateError);

      await expect(service.updatePhoto(personId, photoInput)).rejects.toThrow(
        updateError,
      );

      expect(personsRepositoryMock.update).toHaveBeenCalledWith(personId, {
        photoPath: newStorageKey,
      });
      expect(imageStorageMock.delete).toHaveBeenCalledWith(newStorageKey, true);
    });
  });

  describe('delete', () => {
    it('should delete an existing person', async () => {
      const personId = '1';
      personsRepositoryMock.existsById.mockResolvedValue(true);

      await service.delete(personId);

      expect(personsRepositoryMock.existsById).toHaveBeenCalledWith(personId);
      expect(personsRepositoryMock.delete).toHaveBeenCalledWith(personId);
    });

    it('should throw NotFoundException when deleting non-existing person', async () => {
      const personId = '1';
      personsRepositoryMock.existsById.mockResolvedValue(false);

      await expect(service.delete(personId)).rejects.toThrow(NotFoundException);

      expect(personsRepositoryMock.existsById).toHaveBeenCalledWith(personId);
      expect(personsRepositoryMock.delete).not.toHaveBeenCalled();
    });
  });
});
