import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from '../../src/modules/admin/admin-users.controller';
import { JwtGuard } from '../../src/modules/auth/guards/jwt.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { UsersService } from '../../src/modules/users/services/users.service';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;

  const userId = 'some-uuid';

  const usersServiceMock = {
    searchUsers: jest.fn(),
    promoteToAdmin: jest.fn(),
    demoteFromAdmin: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    })
      .overrideGuard(JwtGuard)
      .useValue(GuardMock)
      .overrideGuard(RolesGuard)
      .useValue(GuardMock)
      .compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchUsers', () => {
    it('should return array of users', async () => {
      const users = { items: [], total: 0 };
      usersServiceMock.searchUsers.mockResolvedValue(users);

      const result = await controller.searchUsers({
        page: 1,
        limit: 10,
        search: 'test',
      });

      expect(result).toEqual(users);
      expect(usersServiceMock.searchUsers).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        'test',
      );
    });
  });

  describe('promoteToAdmin', () => {
    it('should promote user to admin', async () => {
      const result = await controller.promoteToAdmin(userId);

      usersServiceMock.promoteToAdmin.mockResolvedValue(undefined);

      expect(result).toEqual({
        message: 'User promoted to admin successfully',
      });
      expect(usersServiceMock.promoteToAdmin).toHaveBeenCalledWith(userId);
    });

    it('should throw error if promotion fails', async () => {
      usersServiceMock.promoteToAdmin.mockRejectedValue(
        new Error('Promotion failed'),
      );

      await expect(controller.promoteToAdmin(userId)).rejects.toThrow(
        'Promotion failed',
      );
    });
  });

  describe('demoteFromAdmin', () => {
    it('should demote user from admin', async () => {
      const result = await controller.demoteFromAdmin(userId);

      usersServiceMock.demoteFromAdmin.mockResolvedValue(undefined);

      expect(result).toEqual({
        message: 'User demoted from admin successfully',
      });
      expect(usersServiceMock.demoteFromAdmin).toHaveBeenCalledWith(userId);
    });

    it('should throw error if demotion fails', async () => {
      usersServiceMock.demoteFromAdmin.mockRejectedValue(
        new Error('Demotion failed'),
      );

      await expect(controller.demoteFromAdmin(userId)).rejects.toThrow(
        'Demotion failed',
      );
    });
  });
});
