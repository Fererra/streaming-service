import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from 'src/modules/token/token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from 'src/database/repositories/refresh-token.repository';
import { TokenType } from 'src/modules/token/types/token-types.enum';
import { hash, verify } from 'argon2';
import { randomUUID } from 'crypto';
import { UserRoles } from 'src/modules/users/user-roles.enum';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('argon2', () => ({ hash: jest.fn(), verify: jest.fn() }));
jest.mock('crypto', () => ({ randomUUID: jest.fn() }));

describe('TokenService', () => {
  let service: TokenService;

  const jwtServiceMock = { signAsync: jest.fn(), verifyAsync: jest.fn() };

  const refreshTokenRepoMock = {
    store: jest.fn(),
    revoke: jest.fn(),
    findByIdAndUserId: jest.fn(),
    rotateToken: jest.fn(),
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

  const refreshTokenMock = {
    id: 'jti-123',
    userId: 'user-id',
    tokenHash: 'hashed-refresh-token',
    expiresAt: expect.any(Date),
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
      .mockResolvedValueOnce('refresh-token')
      .mockResolvedValueOnce('access-token');
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
      { sub: 'user-id', jti: 'jti-123' },
      { secret: 'refresh-secret', expiresIn: '7d' },
    );
    expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
      2,
      { sub: 'user-id', role: UserRoles.USER },
      { secret: 'access-secret', expiresIn: '15m' },
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockReturnValue('jti-123');
    (hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
    (verify as jest.Mock).mockResolvedValue(true);

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
    setupSignMocks();
    const result = await service.generateAuthTokens(userMock);

    expect(result).toEqual(tokensMock);
    expect(refreshTokenRepoMock.store).toHaveBeenCalledWith(refreshTokenMock);
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

  describe('rotateAuthTokens', () => {
    it('should generate new tokens and rotate refresh token', async () => {
      setupValidRefreshToken();

      const newTokensMock = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      jwtServiceMock.signAsync
        .mockResolvedValueOnce(newTokensMock.refreshToken)
        .mockResolvedValueOnce(newTokensMock.accessToken);

      (hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

      const result = await service.rotateAuthTokens('old-refresh-token', {
        id: 'user-id',
        role: UserRoles.USER,
      });

      expect(result).toEqual(newTokensMock);
      expectSignCalls();
      expect(hash).toHaveBeenCalledWith(newTokensMock.refreshToken);
      expect(refreshTokenRepoMock.rotateToken).toHaveBeenCalledWith(
        'jti-123',
        'user-id',
        expect.any(String),
        'hashed-refresh-token',
        expect.any(Date),
      );
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
    it('should throw if token invalid (JWT verification fails)', async () => {
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

    it('should throw if record not found in DB', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue(createJwtPayload());
      refreshTokenRepoMock.findByIdAndUserId.mockResolvedValue(null);
      await expect(
        (service as any).validateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if token hash does not match', async () => {
      setupValidRefreshToken();
      (verify as jest.Mock).mockResolvedValue(false);
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

    it('should throw if token expired', async () => {
      setupValidRefreshToken({ expiresAt: new Date(Date.now() - 1000) });
      await expect(
        (service as any).validateRefreshToken('token', 'user-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return record if token is valid', async () => {
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
