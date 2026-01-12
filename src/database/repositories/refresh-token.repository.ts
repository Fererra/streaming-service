import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import type { IRefreshTokenRepository } from './interfaces/refresh-token-repository.interface';

export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repository: Repository<RefreshTokenEntity>,
  ) {}

  store(data: Partial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: { id, userId, revokedAt: IsNull() },
    });
  }

  async revoke(jti: string, userId: string): Promise<number> {
    const record = await this.repository.update(
      { id: jti, userId },
      { revokedAt: new Date() },
    );

    return record.affected ?? 0;
  }

  async rotateToken(
    oldJti: string,
    userId: string,
    newJti: string,
    newTokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.update(
        RefreshTokenEntity,
        { id: oldJti, userId },
        { revokedAt: new Date() },
      );

      const newToken = manager.create(RefreshTokenEntity, {
        id: newJti,
        userId,
        tokenHash: newTokenHash,
        expiresAt,
      });

      await manager.save(newToken);

      await manager.update(
        RefreshTokenEntity,
        { id: oldJti, userId },
        {
          replacedByTokenId: newJti,
        },
      );
    });
  }

  async removeExpiredTokens(): Promise<void> {
    await this.repository.delete({
      expiresAt: LessThanOrEqual(new Date()),
    });
  }
}
