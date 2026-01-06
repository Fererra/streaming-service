import { Repository } from 'typeorm';
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
}
