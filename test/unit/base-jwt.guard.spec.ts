import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { BaseJwtGuard } from 'src/modules/auth/base-jwt.guard';
import { UsersService } from 'src/modules/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

class TestGuard extends BaseJwtGuard {
  protected extractToken(request: any) {
    return request.headers['authorization']?.replace('Bearer ', '') || null;
  }
  protected getSecretName() {
    return 'JWT_SECRET';
  }
}

describe('BaseJwtGuard', () => {
  let guard: TestGuard;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;

  const mockUserId = 1;
  const mockPayload = { sub: mockUserId };

  beforeEach(() => {
    usersService = {
      existsById: jest.fn(),
    };
    jwtService = {
      verifyAsync: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('secret'),
    };

    guard = new TestGuard(
      usersService as UsersService,
      jwtService as JwtService,
      configService as ConfigService,
    );
  });

  const createContext = (token?: string) => {
    const request: any = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    } as unknown as ExecutionContext & { request: any };
  };

  it('should throw if no token', async () => {
    await expect(guard.canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if secret not configured', async () => {
    (configService.get as jest.Mock).mockReturnValue(null);
    await expect(guard.canActivate(createContext('token'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if token invalid', async () => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error());
    await expect(guard.canActivate(createContext('token'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw if user does not exist', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
    (usersService.existsById as jest.Mock).mockResolvedValue(false);
    await expect(guard.canActivate(createContext('token'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should return true and attach user if valid', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
    (usersService.existsById as jest.Mock).mockResolvedValue(true);

    const context = createContext('token');
    const request = context.request;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(mockPayload);
  });
});
