import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from 'src/modules/token/token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from 'src/database/repositories/refresh-token.repository';
import { TokenType } from 'src/modules/token/types/token-types.enum';
import { hash } from 'argon2';
import { randomUUID } from 'crypto';
import { UserRoles } from 'src/modules/users/user-roles.enum';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('argon2', () => ({ hash: jest.fn() }));
jest.mock('crypto', () => ({ randomUUID: jest.fn() }));

describe('TokenService', () => {
  let service: TokenService;

  const jwtServiceMock = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const refreshTokenRepoMock = {
    store: jest.fn(),
    revoke: jest.fn(),
    findByIdAndUserId: jest.fn(),
  };
  const configServiceMock = {
    getOrThrow: jest.fn(
      (key: string) =>
        ({
          [`${TokenType.ACCESS_TOKEN}_SECRET`]: 'access-secret',
          [`${TokenType.ACCESS_TOKEN}_EXPIRATION_TIME`]: '15m',
          [`${TokenType.REFRESH_TOKEN}_SECRET`]: 'refresh-secret',
          [`${TokenType.REFRESH_TOKEN}_EXPIRATION_TIME`]: '7d',
        })[key],
    ),
  };

  const userMock = { userId: 'user-id', role: UserRoles.USER };
  const tokensMock = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  const createRefreshTokenRecord = (overrides = {}) => ({
    id: 'jti-123',
    userId: 'user-id',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 1000),
    ...overrides,
  });

  const createJwtPayload = (overrides = {}) => ({
    sub: 'user-id',
    jti: 'jti-123',
    role: UserRoles.USER,
    ...overrides,
  });

  const setupSignMocks = () => {
    jwtServiceMock.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
  };

  const setupValidRefreshToken = (overrides = {}) => {
    jwtServiceMock.verifyAsync.mockResolvedValue(createJwtPayload());
    refreshTokenRepoMock.findByIdAndUserId.mockResolvedValue(
      createRefreshTokenRecord(overrides),
    );
  };

  const expectSignCalls = () => {
    expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
      1,
      { sub: 'user-id', role: UserRoles.USER },
      { secret: 'access-secret', expiresIn: '15m' },
    );
    expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
      2,
      { sub: 'user-id', jti: 'jti-123' },
      { secret: 'refresh-secret', expiresIn: '7d' },
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockReturnValue('jti-123');
    (hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
    setupSignMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepoMock },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('should generate access and refresh tokens and store refresh token', async () => {
    const result = await service.generateAuthTokens(userMock);
    expect(result).toEqual(tokensMock);
    expectSignCalls();
    expect(refreshTokenRepoMock.store).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'jti-123',
        userId: 'user-id',
        tokenHash: 'hashed-refresh-token',
        expiresAt: expect.any(Date),
      }),
    );
  });

  describe('computeExpiration', () => {
    it('should compute expiration from number', () => {
      const exp = (service as any).computeExpiration(60);
      expect(exp.getTime()).toBeGreaterThan(Date.now());
    });

    it('should compute expiration from numeric string', () => {
      const exp = (service as any).computeExpiration('120');
      expect(exp.getTime()).toBeGreaterThan(Date.now());
    });

    it('should compute expiration from string like "1h"', () => {
      const exp = (service as any).computeExpiration('1h');
      expect(exp.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw on invalid format', () => {
      expect(() => (service as any).computeExpiration('invalid')).toThrow(
        'Invalid expiration format',
      );
    });
  });

  describe('getTokenSignOptions', () => {
    it('should return secret and expiresIn', () => {
      const opts = (service as any).getTokenSignOptions(TokenType.ACCESS_TOKEN);
      expect(opts.secret).toBe('access-secret');
      expect(opts.expiresIn).toBe('15m');
    });

    it('should throw if secret not configured', () => {
      (configServiceMock.getOrThrow as jest.Mock).mockImplementationOnce(() => {
        throw new Error('not found');
      });
      expect(() =>
        (service as any).getTokenSignOptions(TokenType.ACCESS_TOKEN),
      ).toThrow('not found');
    });
  });

  describe('invalidateRefreshToken', () => {
    it('should revoke valid token', async () => {
      setupValidRefreshToken();
      refreshTokenRepoMock.revoke.mockResolvedValue(1);
      await service.invalidateRefreshToken('token', 'user-id');
      expect(refreshTokenRepoMock.revoke).toHaveBeenCalledWith(
        'jti-123',
        'user-id',
      );
    });

    it('should throw if revoke returns 0', async () => {
      setupValidRefreshToken();
      refreshTokenRepoMock.revoke.mockResolvedValue(0);
      await expect(
        service.invalidateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateRefreshToken', () => {
    it('should throw if token invalid', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error());
      await expect(
        (service as any).validateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if sub mismatch', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(
        createJwtPayload({ sub: 'other-user' }),
      );
      await expect(
        (service as any).validateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if jti missing', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({ sub: 'user-id' });
      await expect(
        (service as any).validateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if record not found', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(createJwtPayload());
      refreshTokenRepoMock.findByIdAndUserId.mockResolvedValue(null);
      await expect(
        (service as any).validateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if revokedAt is set', async () => {
      setupValidRefreshToken({ revokedAt: new Date() });
      await expect(
        (service as any).validateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if expired', async () => {
      setupValidRefreshToken({ expiresAt: new Date(Date.now() - 1000) });
      await expect(
        (service as any).validateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return record if valid', async () => {
      const record = createRefreshTokenRecord();
      setupValidRefreshToken();
      const result = await (service as any).validateRefreshToken(
        'token',
        'user-id',
      );
      expect(result).toEqual(record);
    });
  });
});
