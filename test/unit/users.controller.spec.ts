import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../src/modules/users/users.controller';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { UsersMediaService } from 'src/modules/users/services/users-media.service';
import { JwtGuard } from 'src/modules/auth/jwt.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const usersMediaServiceMock = {
    updateAvatar: jest.fn(),
    confirmAvatar: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersMediaService, useValue: usersMediaServiceMock },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(GuardMock)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateAvatar', () => {
    it('should return upload URL and storage key', async () => {
      const userId = 'user-1';
      const contentType = 'image/png';
      const expectedResult = {
        uploadUrl: 'https://storage.example.com/signed-url',
        storageKey: 'avatars/123-uuid.png',
      };

      usersMediaServiceMock.updateAvatar.mockResolvedValue(expectedResult);

      const result = await controller.updateAvatar(userId, { contentType });

      expect(usersMediaServiceMock.updateAvatar).toHaveBeenCalledWith(
        userId,
        contentType,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should propagate service errors', async () => {
      const userId = 'user-3';
      const contentType = 'image/png';

      const error = new Error('User not found');
      usersMediaServiceMock.updateAvatar.mockRejectedValue(error);

      await expect(
        controller.updateAvatar(userId, { contentType }),
      ).rejects.toThrow(error);
    });
  });

  describe('confirmAvatar', () => {
    it('should confirm avatar and return success message', async () => {
      const userId = 'user-1';
      const storageKey = 'avatars/123-uuid.png';

      usersMediaServiceMock.confirmAvatar.mockResolvedValue(undefined);

      const result = await controller.confirmAvatar(userId, { storageKey });

      expect(usersMediaServiceMock.confirmAvatar).toHaveBeenCalledWith(
        userId,
        storageKey,
      );
      expect(result).toEqual({ message: 'Avatar updated successfully' });
    });

    it('should propagate service errors', async () => {
      const userId = 'user-1';
      const storageKey = 'avatars/123-uuid.png';

      const error = new Error('No valid upload intent found');
      usersMediaServiceMock.confirmAvatar.mockRejectedValue(error);

      await expect(
        controller.confirmAvatar(userId, { storageKey }),
      ).rejects.toThrow(error);
    });
  });
});
