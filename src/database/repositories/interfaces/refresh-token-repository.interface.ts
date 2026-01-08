import { RefreshTokenEntity } from 'src/database/entities/refresh-token.entity';

export interface IRefreshTokenRepository {
  store(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity>;
  findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<RefreshTokenEntity | null>;
  revoke(jti: string, userId: string): Promise<number>;
  rotateToken(
    oldJti: string,
    userId: string,
    newJti: string,
    newTokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
}
