import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from 'src/modules/users/services/users.service';
import { UserRole } from 'src/modules/users/user-role.enum';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { USERS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { UserEntity } from 'src/database/entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'hashed',
    dateOfBirth: new Date('1990-01-01'),
    role: UserRole.USER,
    country: { code: 'US', countryName: 'United States', users: [] },
    refreshTokens: [],
  };

  const repoMock = {
    findByEmail: jest.fn().mockResolvedValue(null),
    findByUserId: jest.fn().mockResolvedValue(null),
    searchUsers: jest.fn().mockResolvedValue([[], 0]),
    existsById: jest.fn().mockResolvedValue(false),
    createUser: jest.fn().mockResolvedValue(mockUser),
    resolveAuthUser: jest.fn().mockResolvedValue(null),
    promoteToAdmin: jest.fn().mockResolvedValue(undefined),
    demoteFromAdmin: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USERS_REPOSITORY, useValue: repoMock },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find user by email', async () => {
    (repoMock.findByEmail as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.findByEmail('john@example.com');

    expect(repoMock.findByEmail).toHaveBeenCalledWith('john@example.com');
    expect(result).toEqual(mockUser);
  });

  it('should return null if user not found', async () => {
    (repoMock.findByEmail as jest.Mock).mockResolvedValue(null);

    const result = await service.findByEmail('unknown@example.com');

    expect(repoMock.findByEmail).toHaveBeenCalledWith('unknown@example.com');
    expect(result).toBeNull();
  });

  it('should search users with pagination', async () => {
    const mockUsers = [mockUser];
    (repoMock.searchUsers as jest.Mock).mockResolvedValue([mockUsers, 1]);

    const result = await service.searchUsers({ page: 1, limit: 10 }, 'John');

    expect(repoMock.searchUsers).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      'John',
    );
    expect(result.data).toEqual(mockUsers);
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      lastPage: 1,
    });
  });

  it('should check if user exists by ID', async () => {
    (repoMock.existsById as jest.Mock).mockResolvedValue(true);

    const result = await service.existsById('user-1');

    expect(repoMock.existsById).toHaveBeenCalledWith('user-1');
    expect(result).toBe(true);
  });

  it('should return false if user does not exist by ID', async () => {
    (repoMock.existsById as jest.Mock).mockResolvedValue(false);

    const result = await service.existsById('user-2');

    expect(repoMock.existsById).toHaveBeenCalledWith('user-2');
    expect(result).toBe(false);
  });

  it('should create a new user', async () => {
    const userData = {
      email: 'john@example.com',
      firstName: 'John',
    } as Partial<UserEntity>;

    const result = await service.createUser(userData);

    expect(repoMock.createUser).toHaveBeenCalledWith(userData);
    expect(result).toEqual(mockUser);
  });

  it('should resolve auth user', async () => {
    const mockAuthUser = {
      id: 'user-1',
      email: 'john@example.com',
    };
    (repoMock.resolveAuthUser as jest.Mock).mockResolvedValue(mockAuthUser);

    const result = await service.resolveAuthUser('user-1');

    expect(repoMock.resolveAuthUser).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(mockAuthUser);
  });

  it('should throw UnauthorizedException if auth user not found', async () => {
    (repoMock.resolveAuthUser as jest.Mock).mockResolvedValue(null);

    await expect(service.resolveAuthUser('user-2')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repoMock.resolveAuthUser).toHaveBeenCalledWith('user-2');
  });

  it('should promote user to admin', async () => {
    (repoMock.findByUserId as jest.Mock).mockResolvedValue(mockUser);
    (repoMock.promoteToAdmin as jest.Mock).mockResolvedValue(undefined);

    await service.promoteToAdmin('user-1');

    expect(repoMock.findByUserId).toHaveBeenCalledWith('user-1');
    expect(repoMock.promoteToAdmin).toHaveBeenCalledWith('user-1');
  });

  it('should throw NotFoundException if user to promote not found', async () => {
    (repoMock.findByUserId as jest.Mock).mockResolvedValue(null);

    await expect(service.promoteToAdmin('user-2')).rejects.toThrow(
      NotFoundException,
    );
    expect(repoMock.findByUserId).toHaveBeenCalledWith('user-2');
  });

  it('should throw ConflictException if user is already an admin', async () => {
    const adminUser = { ...mockUser, role: UserRole.ADMIN };
    (repoMock.findByUserId as jest.Mock).mockResolvedValue(adminUser);

    await expect(service.promoteToAdmin('user-1')).rejects.toThrow(
      ConflictException,
    );
    expect(repoMock.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('should demote admin to user', async () => {
    const adminUser = { ...mockUser, role: UserRole.ADMIN };
    (repoMock.findByUserId as jest.Mock).mockResolvedValue(adminUser);
    (repoMock.demoteFromAdmin as jest.Mock).mockResolvedValue(undefined);

    await service.demoteFromAdmin('user-1');

    expect(repoMock.findByUserId).toHaveBeenCalledWith('user-1');
    expect(repoMock.demoteFromAdmin).toHaveBeenCalledWith('user-1');
  });

  it('should throw NotFoundException if user to demote not found', async () => {
    (repoMock.findByUserId as jest.Mock).mockResolvedValue(null);

    await expect(service.demoteFromAdmin('user-2')).rejects.toThrow(
      NotFoundException,
    );
    expect(repoMock.findByUserId).toHaveBeenCalledWith('user-2');
  });

  it('should throw ConflictException if user is not an admin', async () => {
    (repoMock.findByUserId as jest.Mock).mockResolvedValue(mockUser);

    await expect(service.demoteFromAdmin('user-1')).rejects.toThrow(
      ConflictException,
    );
    expect(repoMock.findByUserId).toHaveBeenCalledWith('user-1');
  });
});
