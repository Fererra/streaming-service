import { UploadIntentEntity } from 'src/database/entities/upload-intent.entity';
import { IntentStatus } from 'src/modules/storage/intent-status.enum';

export interface IUploadIntentsRepository {
  createUploadIntent(
    data: Partial<UploadIntentEntity>,
  ): Promise<UploadIntentEntity>;
  updateStatus(id: string, status: IntentStatus): Promise<void>;
  consumeIntent(
    entityType: string,
    entityId: string,
    storageKey: string,
    newStatus: IntentStatus,
  ): Promise<UploadIntentEntity | null>;
}
