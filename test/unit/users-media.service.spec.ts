import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersMediaService } from 'src/modules/users/services/users-media.service';
import {
  UPLOAD_INTENTS_REPOSITORY,
  USERS_REPOSITORY,
} from 'src/database/repositories/tokens/repository.tokens';
import { OBJECT_STORAGE } from 'src/modules/storage/storage.token';
import { BucketType } from 'src/modules/storage/object-storage.interface';
import { IntentStatus } from 'src/modules/storage/intent-status.enum';

describe('UsersMediaService', () => {
  let service: UsersMediaService;

  const usersRepositoryMock = {
    existsById: jest.fn(),
    swapAvatarPath: jest.fn(),
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
        UsersMediaService,
        { provide: USERS_REPOSITORY, useValue: usersRepositoryMock },
        { provide: OBJECT_STORAGE, useValue: storageMock },
        { provide: UPLOAD_INTENTS_REPOSITORY, useValue: intentsMock },
      ],
    }).compile();

    service = module.get<UsersMediaService>(UsersMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateAvatar', () => {
    const userId = 'user-123';
    const contentType = 'image/jpeg';

    it('should generate signed upload URL for existing user', async () => {
      const expectedUploadUrl = 'https://storage.example.com/signed-url';

      usersRepositoryMock.existsById.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue(expectedUploadUrl);

      const result = await service.updateAvatar(userId, contentType);

      expect(intentsMock.createUploadIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'user_avatar',
          entityId: userId,
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

    it('should throw BadRequestException for invalid content type', async () => {
      usersRepositoryMock.existsById.mockResolvedValue(true);

      await expect(
        service.updateAvatar(userId, 'invalid/type'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle png content type', async () => {
      usersRepositoryMock.existsById.mockResolvedValue(true);
      intentsMock.createUploadIntent.mockResolvedValue({ id: 'intent-1' });
      storageMock.generateSignedUploadUrl.mockResolvedValue('https://url');

      const result = await service.updateAvatar(userId, 'image/png');

      expect(result.storageKey).toContain('.png');
    });
  });

  describe('confirmAvatar', () => {
    const userId = 'user-123';
    const storageKey = 'avatars/123-uuid.jpg';
    const mockIntent = {
      id: 'intent-1',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    it('should confirm avatar when intent is valid', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      usersRepositoryMock.swapAvatarPath.mockResolvedValue(null);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await service.confirmAvatar(userId, storageKey);

      expect(intentsMock.consumeIntent).toHaveBeenCalledWith(
        'user_avatar',
        userId,
        storageKey,
        IntentStatus.IN_PROGRESS,
      );
      expect(storageMock.exists).toHaveBeenCalledWith(
        storageKey,
        BucketType.PUBLIC,
      );
      expect(usersRepositoryMock.swapAvatarPath).toHaveBeenCalledWith(
        userId,
        storageKey,
      );
      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.COMPLETED,
      );
    });

    it('should delete old avatar when it exists', async () => {
      const oldAvatarKey = 'avatars/old-avatar.jpg';

      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(true);
      usersRepositoryMock.swapAvatarPath.mockResolvedValue(oldAvatarKey);
      intentsMock.updateStatus.mockResolvedValue(undefined);
      storageMock.delete.mockResolvedValue(undefined);

      await service.confirmAvatar(userId, storageKey);

      expect(storageMock.delete).toHaveBeenCalledWith(
        oldAvatarKey,
        BucketType.PUBLIC,
      );
    });

    it('should throw BadRequestException when no valid intent found', async () => {
      intentsMock.consumeIntent.mockResolvedValue(null);

      await expect(service.confirmAvatar(userId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(usersRepositoryMock.swapAvatarPath).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when file not found in storage', async () => {
      intentsMock.consumeIntent.mockResolvedValue(mockIntent);
      storageMock.exists.mockResolvedValue(false);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await expect(service.confirmAvatar(userId, storageKey)).rejects.toThrow(
        BadRequestException,
      );

      expect(intentsMock.updateStatus).toHaveBeenCalledWith(
        mockIntent.id,
        IntentStatus.FAILED,
      );
      expect(usersRepositoryMock.swapAvatarPath).not.toHaveBeenCalled();
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

      await expect(service.confirmAvatar(userId, storageKey)).rejects.toThrow(
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
      usersRepositoryMock.swapAvatarPath.mockRejectedValue(error);
      storageMock.delete.mockResolvedValue(undefined);
      intentsMock.updateStatus.mockResolvedValue(undefined);

      await expect(service.confirmAvatar(userId, storageKey)).rejects.toThrow(
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
