import { IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

export class RefreshTokenRepository {
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
}
