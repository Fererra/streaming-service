import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from 'src/modules/users/users.service';
import { UsersRepository } from 'src/database/repositories/users.repository';
import { UserEntity } from 'src/database/entities/user.entity';
import { UserRoles } from 'src/modules/users/user-roles.enum';
import { UnauthorizedException } from '@nestjs/common';
import { USERS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';

describe('UsersService', () => {
  let service: UsersService;
  let repoMock: Partial<UsersRepository>;

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'hashed',
    dateOfBirth: new Date('1990-01-01'),
    role: UserRoles.USER,
    country: { code: 'US', countryName: 'United States', users: [] },
    refreshTokens: [],
  } as UserEntity;

  beforeEach(async () => {
    repoMock = {
      findByEmail: jest.fn().mockResolvedValue(null),
      existsById: jest.fn().mockResolvedValue(false),
      createUser: jest.fn().mockResolvedValue(mockUser),
      resolveAuthUser: jest.fn().mockResolvedValue(null),
    };

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
});
