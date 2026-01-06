import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import type { SignUpDto } from 'src/modules/auth/dto/sign-up.dto';
import type { LoginDto } from 'src/modules/auth/dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    signUp: jest.fn(),
    login: jest.fn(),
  };

  const configServiceMock = {
    get: (key: string) => ({ NODE_ENV: 'test', COOKIE_MAX_AGE: 1000 })[key],
  };

  const responseMock = {
    cookie: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('sets refresh token cookie and returns access token', async () => {
      authServiceMock.signUp.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

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
      authServiceMock.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

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
});
