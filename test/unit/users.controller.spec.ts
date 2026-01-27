import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../src/modules/users/users.controller';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';
import { JwtGuard } from 'src/modules/auth/jwt.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    updateAvatar: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
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
    it('should successfully update user avatar', async () => {
      const userId = 'user-1';
      const mockFile = {
        mimetype: 'image/png',
        buffer: Buffer.from('image-data'),
      } as Express.Multer.File;

      usersServiceMock.updateAvatar.mockResolvedValue(undefined);

      const result = await controller.updateAvatar(userId, mockFile);

      expect(usersServiceMock.updateAvatar).toHaveBeenCalledWith(userId, {
        buffer: mockFile.buffer,
        contentType: mockFile.mimetype,
      });
      expect(result).toEqual({
        message: 'User avatar updated successfully',
      });
    });

    it('should propagate service errors', async () => {
      const userId = 'user-3';
      const mockFile = {
        mimetype: 'image/png',
        buffer: Buffer.from('image-data'),
      } as Express.Multer.File;

      const error = new Error('Storage error');
      usersServiceMock.updateAvatar.mockRejectedValue(error);

      await expect(controller.updateAvatar(userId, mockFile)).rejects.toThrow(
        error,
      );
      expect(usersServiceMock.updateAvatar).toHaveBeenCalledWith(userId, {
        buffer: mockFile.buffer,
        contentType: mockFile.mimetype,
      });
    });

    it('should pass buffer and content type from file', async () => {
      const userId = 'user-4';
      const imageBuffer = Buffer.from('custom-image-data');
      const mockFile = {
        mimetype: 'image/webp',
        buffer: imageBuffer,
      } as Express.Multer.File;

      usersServiceMock.updateAvatar.mockResolvedValue(undefined);

      await controller.updateAvatar(userId, mockFile);

      const callArgs = usersServiceMock.updateAvatar.mock.calls[0];
      expect(callArgs[0]).toBe(userId);
      expect(callArgs[1].buffer).toBe(imageBuffer);
      expect(callArgs[1].contentType).toBe('image/webp');
    });
  });
});
