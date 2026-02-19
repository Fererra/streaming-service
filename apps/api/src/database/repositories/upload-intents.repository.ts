import { Repository } from 'typeorm';
import { UploadIntentEntity } from '../entities/upload-intent.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IUploadIntentsRepository } from './interfaces/upload-intents-repository.interface';
import { IntentStatus } from '../../modules/storage/intent-status.enum';

export class UploadIntentsRepository implements IUploadIntentsRepository {
  constructor(
    @InjectRepository(UploadIntentEntity)
    private readonly repository: Repository<UploadIntentEntity>,
  ) {}

  createUploadIntent(
    data: Partial<UploadIntentEntity>,
  ): Promise<UploadIntentEntity> {
    const uploadIntent = this.repository.create(data);
    return this.repository.save(uploadIntent);
  }

  async updateStatus(id: string, status: IntentStatus): Promise<void> {
    await this.repository.update(id, { status });
  }

  async consumeIntent(
    entityType: string,
    entityId: string,
    storageKey: string,
    newStatus: IntentStatus,
  ): Promise<UploadIntentEntity | null> {
    return this.repository.manager.transaction(async (manager) => {
      const intent = await manager.findOne(UploadIntentEntity, {
        where: {
          entityType,
          entityId,
          storageKey,
          status: IntentStatus.PENDING,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!intent) {
        return null;
      }

      await manager.update(UploadIntentEntity, intent.id, {
        status: newStatus,
      });

      return intent;
    });
  }
}
