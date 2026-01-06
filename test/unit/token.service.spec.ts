import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from 'src/modules/token/token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from 'src/database/repositories/refresh-token.repository';
import { TokenType } from 'src/modules/token/types/token-types.enum';
import { hash } from 'argon2';
import { randomUUID } from 'crypto';
import { UserRoles } from 'src/modules/users/user-roles.enum';

jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('TokenService', () => {
  let service: TokenService;

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  const refreshTokenRepoMock = {
    store: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const map = {
        [`${TokenType.ACCESS_TOKEN}_SECRET`]: 'access-secret',
        [`${TokenType.ACCESS_TOKEN}_EXPIRATION_TIME`]: '15m',
        [`${TokenType.REFRESH_TOKEN}_SECRET`]: 'refresh-secret',
        [`${TokenType.REFRESH_TOKEN}_EXPIRATION_TIME`]: '7d',
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (randomUUID as jest.Mock).mockReturnValue('jti-123');
    (hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

    jwtServiceMock.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        {
          provide: RefreshTokenRepository,
          useValue: refreshTokenRepoMock,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('should generate access and refresh tokens and store refresh token', async () => {
    const result = await service.generateAuthTokens({
      userId: 'user-1',
      role: UserRoles.USER,
    });

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
      1,
      { sub: 'user-1', role: 'USER' },
      { secret: 'access-secret', expiresIn: '15m' },
    );

    expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
      2,
      { sub: 'user-1', jti: 'jti-123' },
      { secret: 'refresh-secret', expiresIn: '7d' },
    );

    expect(refreshTokenRepoMock.store).toHaveBeenCalledWith({
      id: 'jti-123',
      userId: 'user-1',
      tokenHash: 'hashed-refresh-token',
      expiresAt: expect.any(Date),
    });
  });
});
