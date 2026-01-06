import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens } from './types/auth-tokens.type';
import { GenerateTokensParams } from './types/generate-token.params';
import { randomUUID } from 'crypto';
import { RefreshTokenRepository } from 'src/database/repositories/refresh-token.repository';
import { hash } from 'argon2';
import type { StringValue } from 'ms';
import { TokenType } from './types/token-types.enum';
import type { TokenSignOptions } from './types/token-sign-options.type';
import ms from 'ms';
import { StoreRefreshTokenParams } from './types/store-refresh-token.params';
import { RefreshTokenEntity } from 'src/database/entities/refresh-token.entity';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async generateAuthTokens(params: GenerateTokensParams): Promise<AuthTokens> {
    const { secret: accessSecret, expiresIn: accessExpires } =
      this.getTokenSignOptions(TokenType.ACCESS_TOKEN);
    const { secret: refreshSecret, expiresIn: refreshExpires } =
      this.getTokenSignOptions(TokenType.REFRESH_TOKEN);

    const jti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: params.userId, role: params.role },
        { secret: accessSecret, expiresIn: accessExpires },
      ),
      this.jwtService.signAsync(
        { sub: params.userId, jti },
        { secret: refreshSecret, expiresIn: refreshExpires },
      ),
    ]);

    await this.storeRefreshToken({
      userId: params.userId,
      jti,
      token: refreshToken,
      expiresIn: refreshExpires,
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    params: StoreRefreshTokenParams,
  ): Promise<void> {
    const expiresAt = this.computeExpiration(params.expiresIn);

    await this.refreshTokenRepository.store({
      id: params.jti,
      userId: params.userId,
      tokenHash: await hash(params.token),
      expiresAt,
    });
  }

  private computeExpiration(expiresIn: StringValue | number): Date {
    if (typeof expiresIn === 'number')
      return new Date(Date.now() + expiresIn * 1000);

    const n = Number(expiresIn);
    if (!Number.isNaN(n)) return new Date(Date.now() + n * 1000);

    const msVal = ms(expiresIn as StringValue);
    if (!msVal) throw new Error('Invalid expiration format');

    return new Date(Date.now() + msVal);
  }

  private getTokenSignOptions(token: TokenType): TokenSignOptions {
    const secret = this.configService.getOrThrow<string>(`${token}_SECRET`);
    const expiresIn = this.configService.getOrThrow<StringValue | number>(
      `${token}_EXPIRATION_TIME`,
    );
    return { secret, expiresIn };
  }

  async invalidateRefreshToken(
    refreshToken: string,
    userId: string,
  ): Promise<void> {
    const record = await this.validateRefreshToken(refreshToken, userId);

    const rowsAffected = await this.refreshTokenRepository.revoke(
      record.id,
      userId,
    );

    if (!rowsAffected)
      throw new UnauthorizedException('Refresh token revoked or not found');
  }

  private async validateRefreshToken(
    presentedRefreshToken: string,
    presentedUserId: string,
  ): Promise<RefreshTokenEntity> {
    const { secret: refreshSecret } = this.getTokenSignOptions(
      TokenType.REFRESH_TOKEN,
    );

    const payload = await this.jwtService
      .verifyAsync(presentedRefreshToken, {
        secret: refreshSecret,
      })
      .catch(() => {
        throw new UnauthorizedException('Invalid refresh token');
      });

    const { sub, jti } = payload;

    if (sub !== presentedUserId)
      throw new UnauthorizedException('Token does not belong to user');

    if (!jti) throw new UnauthorizedException('Invalid refresh token');

    const record = await this.refreshTokenRepository.findByIdAndUserId(
      jti,
      presentedUserId,
    );
    if (!record) throw new UnauthorizedException('Refresh token not found');

    if (record.revokedAt)
      throw new UnauthorizedException('Refresh token revoked');
    if (record.expiresAt && record.expiresAt < new Date())
      throw new UnauthorizedException('Refresh token expired');

    return record;
  }
}
