import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import type { SignUpDto } from 'src/modules/auth/dto/sign-up.dto';
import type { LoginDto } from 'src/modules/auth/dto/login.dto';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtGuard } from 'src/modules/auth/jwt.guard';

describe('AuthController', () => {
  let controller: AuthController;

  const JwtGuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  const authServiceMock = {
    signUp: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  };

  const configServiceMock = {
    get: (key: string) => ({ NODE_ENV: 'test', COOKIE_MAX_AGE: 1000 })[key],
  };

  const responseMock = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any;

  const setupAuthReturn = (
    access = 'access-token',
    refresh = 'refresh-token',
  ) => ({
    accessToken: access,
    refreshToken: refresh,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(JwtGuardMock)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('sets refresh token cookie and returns access token', async () => {
      authServiceMock.signUp.mockResolvedValue(setupAuthReturn());

      const result = await controller.signUp({} as SignUpDto, responseMock);

      expect(authServiceMock.signUp).toHaveBeenCalledWith({});
      expect(responseMock.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        {
          httpOnly: true,
          path: '/',
          secure: false,
          sameSite: 'strict',
          maxAge: 1000,
        },
      );
      expect(result).toEqual({ accessToken: 'access-token' });
    });
  });

  describe('login', () => {
    it('sets refresh token cookie and returns access token', async () => {
      authServiceMock.login.mockResolvedValue(setupAuthReturn());

      const result = await controller.login({} as LoginDto, responseMock);

      expect(authServiceMock.login).toHaveBeenCalledWith({});
      expect(responseMock.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        {
          httpOnly: true,
          path: '/',
          secure: false,
          sameSite: 'strict',
          maxAge: 1000,
        },
      );
      expect(result).toEqual({ accessToken: 'access-token' });
    });
  });

  describe('logout', () => {
    it('calls authService.logout and clears refresh token cookie', async () => {
      await controller.logout('rt', 'user-id', responseMock);

      expect(authServiceMock.logout).toHaveBeenCalled();
      expect(responseMock.clearCookie).toHaveBeenCalledWith('refresh_token', {
        httpOnly: true,
        path: '/',
        secure: false,
        sameSite: 'strict',
      });
    });
  });
});
