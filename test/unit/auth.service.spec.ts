import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/modules/auth/auth.service';
import { UsersService } from 'src/modules/users/users.service';
import { TokenService } from 'src/modules/token/token.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { SignUpDto } from 'src/modules/auth/dto/sign-up.dto';
import type { LoginDto } from 'src/modules/auth/dto/login.dto';
import { UserRoles } from 'src/modules/users/user-roles.enum';
import { hash, verify } from 'argon2';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    resolveAuthUser: jest.fn(),
  };

  const tokenServiceMock = {
    generateAuthTokens: jest.fn(),
    invalidateRefreshToken: jest.fn(),
    rotateAuthTokens: jest.fn(),
  };

  const userMock = {
    id: 'user-id',
    role: UserRoles.USER,
    password: 'hashed-password',
  };

  const tokensMock = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  const signUpDto: SignUpDto = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password',
    dateOfBirth: '1990-01-01',
    country: 'UA',
  };

  const loginDto: LoginDto = {
    email: signUpDto.email,
    password: signUpDto.password,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (hash as jest.Mock).mockResolvedValue('hashed-password');
    (verify as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: TokenService, useValue: tokenServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('signUp', () => {
    it('creates user and returns tokens', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);
      usersServiceMock.createUser.mockResolvedValue(userMock);
      tokenServiceMock.generateAuthTokens.mockResolvedValue(tokensMock);

      const result = await service.signUp(signUpDto);

      expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(
        signUpDto.email,
      );
      expect(usersServiceMock.createUser).toHaveBeenCalled();
      expect(tokenServiceMock.generateAuthTokens).toHaveBeenCalledWith({
        userId: userMock.id,
        role: userMock.role,
      });
      expect(result).toEqual(tokensMock);
    });

    it('throws ConflictException if email exists', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(userMock);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(userMock);
      tokenServiceMock.generateAuthTokens.mockResolvedValue(tokensMock);

      const result = await service.login(loginDto);

      expect(verify).toHaveBeenCalledWith(userMock.password, loginDto.password);
      expect(result).toEqual(tokensMock);
    });

    it('throws ForbiddenException if user not found', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if password invalid', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(userMock);
      (verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rotateAuthTokens', () => {
    it('rotates and returns new tokens', async () => {
      usersServiceMock.resolveAuthUser.mockResolvedValue({
        id: userMock.id,
        role: userMock.role,
      });
      tokenServiceMock.rotateAuthTokens.mockResolvedValue(tokensMock);

      const result = await service.rotateAuthTokens('refresh-token', 'user-id');

      expect(usersServiceMock.resolveAuthUser).toHaveBeenCalledWith('user-id');
      expect(tokenServiceMock.rotateAuthTokens).toHaveBeenCalledWith(
        'refresh-token',
        { id: userMock.id, role: userMock.role },
      );
      expect(result).toEqual(tokensMock);
    });
  });

  describe('logout', () => {
    it('invalidates refresh token', async () => {
      const refreshToken = 'rt';
      const userId = 'user-id';

      tokenServiceMock.invalidateRefreshToken.mockResolvedValue(undefined);

      await service.logout(refreshToken, userId);

      expect(tokenServiceMock.invalidateRefreshToken).toHaveBeenCalledWith(
        refreshToken,
        userId,
      );
    });
  });
});
