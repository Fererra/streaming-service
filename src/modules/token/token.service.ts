import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens } from './types/auth-tokens.type';
import { GenerateTokensParams } from './types/generate-token.params';
import { randomUUID } from 'crypto';
import { hash, verify } from 'argon2';
import type { StringValue } from 'ms';
import { TokenType } from './types/token-types.enum';
import type { TokenSignOptions } from './types/token-sign-options.type';
import ms from 'ms';
import { StoreRefreshTokenParams } from './types/store-refresh-token.params';
import { RefreshTokenEntity } from 'src/database/entities/refresh-token.entity';
import type { AuthUser } from '../auth/types/auth-user.type';
import { REFRESH_TOKEN_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import type { IRefreshTokenRepository } from 'src/database/repositories/interfaces/refresh-token-repository.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async generateAuthTokens(params: GenerateTokensParams): Promise<AuthTokens> {
    const jti = randomUUID();

    const refreshToken = await this.generateRefreshToken(params.userId, jti);

    await this.storeRefreshToken({
      userId: params.userId,
      jti,
      token: refreshToken,
    });

    const accessToken = await this.generateAccessToken(
      params.userId,
      params.role,
    );

    return { accessToken, refreshToken };
  }

  private generateAccessToken(userId: string, role: string): Promise<string> {
    const { secret: accessSecret, expiresIn: accessExpires } =
      this.getTokenSignOptions(TokenType.ACCESS_TOKEN);

    return this.jwtService.signAsync(
      { sub: userId, role },
      { secret: accessSecret, expiresIn: accessExpires },
    );
  }

  private generateRefreshToken(userId: string, jti: string): Promise<string> {
    const { secret: refreshSecret, expiresIn: refreshExpires } =
      this.getTokenSignOptions(TokenType.REFRESH_TOKEN);

    return this.jwtService.signAsync(
      { sub: userId, jti },
      { secret: refreshSecret, expiresIn: refreshExpires },
    );
  }

  private async storeRefreshToken(
    params: StoreRefreshTokenParams,
  ): Promise<void> {
    const { expiresIn } = this.getTokenSignOptions(TokenType.REFRESH_TOKEN);
    const expiresAt = this.computeExpiration(expiresIn);

    await this.refreshTokenRepository.store({
      id: params.jti,
      userId: params.userId,
      tokenHash: await hash(params.token),
      expiresAt,
    });
  }

  private computeExpiration(expiresIn: StringValue | number): Date {
    const msVal =
      typeof expiresIn === 'number' ? expiresIn * 1000 : ms(expiresIn);

    if (!msVal)
      throw new InternalServerErrorException('Invalid expiration format');

    return new Date(Date.now() + msVal);
  }

  private getTokenSignOptions(token: TokenType): TokenSignOptions {
    const secret = this.configService.getOrThrow<string>(`${token}_SECRET`);
    const expiresIn = this.configService.getOrThrow<StringValue | number>(
      `${token}_EXPIRATION_TIME`,
    );
    return { secret, expiresIn };
  }

  async rotateAuthTokens(
    refreshToken: string,
    user: AuthUser,
  ): Promise<AuthTokens> {
    const { id: oldJti } = await this.validateRefreshToken(
      refreshToken,
      user.id,
    );

    const jti = randomUUID();
    const newRefreshToken = await this.generateRefreshToken(user.id, jti);

    const tokenHash = await hash(newRefreshToken);
    const { expiresIn } = this.getTokenSignOptions(TokenType.REFRESH_TOKEN);
    const expiresAt = this.computeExpiration(expiresIn);

    await this.refreshTokenRepository.rotateToken(
      oldJti,
      user.id,
      jti,
      tokenHash,
      expiresAt,
    );

    const accessToken = await this.generateAccessToken(user.id, user.role);

    return { accessToken, refreshToken: newRefreshToken };
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

    const isValid = await verify(record.tokenHash, presentedRefreshToken);

    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    if (record.revokedAt)
      throw new UnauthorizedException('Refresh token revoked');
    if (record.expiresAt && record.expiresAt < new Date())
      throw new UnauthorizedException('Refresh token expired');

    return record;
  }

  async removeExpiredTokens(): Promise<void> {
    const { expiresIn } = this.getTokenSignOptions(TokenType.REFRESH_TOKEN);
    const msVal =
      typeof expiresIn === 'number' ? expiresIn * 1000 : ms(expiresIn);

    const expiredDate = new Date(Date.now() - msVal);

    await this.refreshTokenRepository.removeExpiredTokens(expiredDate);
  }
}
