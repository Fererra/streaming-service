import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PersonsMediaService } from '../../src/modules/persons/services/persons-media.service';
import {
  PERSONS_REPOSITORY,
  UPLOAD_INTENTS_REPOSITORY,
} from '../../src/database/repositories/tokens/repository.tokens';
import { OBJECT_STORAGE } from '../../src/modules/storage/storage.token';
import { BucketType } from '../../src/modules/storage/object-storage.interface';
import { IntentStatus } from '../../src/modules/storage/intent-status.enum';

describe('PersonsMediaService', () => {
  let service: PersonsMediaService;

  const personsRepositoryMock = {
    existsById: jest.fn(),
    swapPhotoPath: jest.fn(),
  };

  const storageMock = {
    generateSignedUploadUrl: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  const intentsMock = {
    createUploadIntent: jest.fn(),
    consumeIntent: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonsMediaService,
        { provide: PERSONS_REPOSITORY, useValue: personsRepositoryMock },
        { provide: OBJECT_STORAGE, useValue: storageMock },
        { provide: UPLOAD_INTENTS_REPOSITORY, useValue: intentsMock },
      ],
    }).compile();

    service = module.get<PersonsMediaService>(PersonsMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePhoto', () => {
    const personId = 'person-123';
    const contentType = 'image/jpeg';

    it('should generate signed upload URL for existing person', async () => {
      const expectedUploadUrl = 'https://storage.example.com/signed-url';

      personsRepositoryMock.existsById.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue(expectedUploadUrl);

      const result = await service.updatePhoto(personId, contentType);

      expect(personsRepositoryMock.existsById).toHaveBeenCalledWith(personId);
      expect(intentsMock.createUploadIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'person_photo',
          entityId: personId,
          contentType,
        }),
      );
      expect(storageMock.generateSignedUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket: BucketType.PUBLIC,
          contentType,
        }),
      );
      expect(result.uploadUrl).toBe(expectedUploadUrl);
      expect(result.storageKey).toBeDefined();
    });

    it('should throw NotFoundException if person does not exist', async () => {
      personsRepositoryMock.existsById.mockResolvedValue(false);

      await expect(service.updatePhoto(personId, contentType)).rejects.toThrow(
        NotFoundException,
      );

      expect(intentsMock.createUploadIntent).not.toHaveBeenCalled();
      expect(storageMock.generateSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid content type', async () => {
      personsRepositoryMock.existsById.mockResolvedValue(true);

      await expect(
        service.updatePhoto(personId, 'invalid/type'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle png content type', async () => {
      personsRepositoryMock.existsById.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue('https://url');

      const result = await service.updatePhoto(personId, 'image/png');

      expect(result.storageKey).toContain('.png');
    });
  });

  describe('confirmPhoto', () => {
    const personId = 'person-123';
    const storageKey = 'photos/123-uuid.jpg';
    const mockIntent = {
      id: 'intent-1',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    it('should confirm photo when intent is valid', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      personsRepositoryMock.swapPhotoPath.mockResolvedValue(null);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await service.confirmPhoto(personId, storageKey);

      expect(intentsMock.consumeIntent).toHaveBeenCalledWith(
        'person_photo',
        personId,
        storageKey,
        IntentStatus.IN_PROGRESS,
      );
      expect(storageMock.exists).toHaveBeenCalledWith(
        storageKey,
        BucketType.PUBLIC,
      );
      expect(personsRepositoryMock.swapPhotoPath).toHaveBeenCalledWith(
        personId,
        storageKey,
      );
      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.COMPLETED,
      );
    });

    it('should delete old photo when it exists', async () => {
      const oldPhotoKey = 'photos/old-photo.jpg';

      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      personsRepositoryMock.swapPhotoPath.mockResolvedValue(oldPhotoKey);
      intentsMock.updateStatus.mockResolvedValue(undefined);
      storageMock.delete.mockResolvedValue(undefined);

      await service.confirmPhoto(personId, storageKey);

      expect(storageMock.delete).toHaveBeenCalledWith(
        oldPhotoKey,
        BucketType.PUBLIC,
      );
    });

    it('should throw BadRequestException when no valid intent found', async () => {
      intentsMock.consumeIntent.mockResolvedValue(null);

      await expect(service.confirmPhoto(personId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(personsRepositoryMock.swapPhotoPath).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when file not found in storage', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(false);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await expect(service.confirmPhoto(personId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.FAILED,
      );
      expect(personsRepositoryMock.swapPhotoPath).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when intent is expired', async () => {
      const expiredIntent = {
        id: 'intent-1',
        expiresAt: new Date(Date.now() - 1000),
      };

      intentsMock.consumeIntent.mockResolvedValue(expiredIntent);
      storageMock.exists.mockResolvedValue(true);
      intentsMock.updateStatus.mockResolvedValue(undefined);
      storageMock.delete.mockResolvedValue(undefined);

      await expect(service.confirmPhoto(personId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        expiredIntent.id,
        IntentStatus.EXPIRED,
      );
      expect(storageMock.delete).toHaveBeenCalledWith(
        storageKey,
        BucketType.PUBLIC,
      );
    });

    it('should cleanup and reset intent if swap fails', async () => {
      const error = new Error('Database error');

      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      personsRepositoryMock.swapPhotoPath.mockRejectedValue(error);
      storageMock.delete.mockResolvedValue(undefined);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await expect(service.confirmPhoto(personId, storageKey)).rejects.toThrow(
        error,
      );

      expect(storageMock.delete).toHaveBeenCalledWith(
        storageKey,
        BucketType.PUBLIC,
      );
      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.PENDING,
      );
    });
  });
});
