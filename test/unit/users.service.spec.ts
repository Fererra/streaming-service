import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from 'src/modules/users/users.service';
import { UsersRepository } from 'src/database/repositories/users.repository';
import { UserEntity } from 'src/database/entities/user.entity';
import { UserRoles } from 'src/modules/users/user-roles.enum';

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
    country: { code: 'USA', countryName: 'United States', users: [] },
    refreshTokens: [],
  } as UserEntity;

  beforeEach(async () => {
    repoMock = {
      findByEmail: jest.fn().mockResolvedValue(null),
      createUser: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repoMock },
      ],
    }).compile();

    service = module.get(UsersService);
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

  it('should create a new user', async () => {
    const userData = {
      email: 'john@example.com',
      firstName: 'John',
    } as Partial<UserEntity>;

    const result = await service.createUser(userData);

    expect(repoMock.createUser).toHaveBeenCalledWith(userData);
    expect(result).toEqual(mockUser);
  });
});
