import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { hostname } from 'os';
import { OutboxEntity, OutboxEventStatus } from '@app/outbox';
import {
  CommandPayload,
  CommandType,
  PAYMENT_QUEUE_SERVICE,
  type IPaymentQueueService,
} from '@app/payment';

@Injectable()
export class OutboxPoller
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly MAX_ATTEMPTS = 5;
  private readonly BATCH_SIZE = 50;
  private readonly POLL_INTERVAL_MS = 1000;
  private readonly RETRY_DELAYS_SECONDS = [5, 30, 120, 300, 600];
  private readonly workerId = `${hostname()}-${process.pid}`;
  private isRunning = true;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
  ) {}

  onApplicationBootstrap(): void {
    this.startPolling();
  }

  onApplicationShutdown(): void {
    this.isRunning = false;
  }

  private async startPolling(): Promise<void> {
    while (this.isRunning) {
      await this.poll().catch(() => {});
      await this.sleep(this.POLL_INTERVAL_MS);
    }
  }

  private async poll(): Promise<void> {
    const records = await this.lockAndFetchPending();

    if (records.length === 0) return;

    await Promise.allSettled(
      records.map((record) => this.processRecord(record)),
    );
  }

  private async lockAndFetchPending(): Promise<OutboxEntity[]> {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(OutboxEntity)
      .set({
        status: OutboxEventStatus.PROCESSING,
        lockedAt: () => 'NOW()',
        lockedBy: this.workerId,
      })
      .where(
        `id IN (
          SELECT id FROM outbox
          WHERE
            (
              status IN (:...activeStatuses)
              AND (nextRetryAt IS NULL OR nextRetryAt <= NOW())
              AND attempts < :maxAttempts
            )
            OR (
              status = :processingStatus
              AND locked_at < NOW() - INTERVAL '30 seconds'
            )
          ORDER BY created_at
          LIMIT :limit
          FOR UPDATE SKIP LOCKED
        )`,
        {
          activeStatuses: [
            OutboxEventStatus.PENDING,
            OutboxEventStatus.RETRYING,
          ],
          processingStatus: OutboxEventStatus.PROCESSING,
          maxAttempts: this.MAX_ATTEMPTS,
          limit: this.BATCH_SIZE,
        },
      )
      .returning(
        'type AS type, payload AS payload, id AS id, attempts AS attempts',
      )
      .execute();

    return result.raw as OutboxEntity[];
  }

  private async processRecord(record: OutboxEntity): Promise<void> {
    try {
      await this.paymentQueueService.dispatchCommand(
        record.type as CommandType,
        record.payload as CommandPayload<CommandType>,
      );

      await this.dataSource.getRepository(OutboxEntity).update(
        { id: record.id },
        {
          status: OutboxEventStatus.PUBLISHED,
          lockedBy: null,
          lockedAt: null,
        },
      );
    } catch (e) {
      await this.handleFailure(record, e as Error);
    }
  }

  private async handleFailure(
    record: OutboxEntity,
    error: Error,
  ): Promise<void> {
    const attempts = record.attempts + 1;

    if (attempts >= this.MAX_ATTEMPTS) {
      await this.markAsFailed(record.id, attempts, error.message);
      return;
    }

    await this.markForRetry(record.id, attempts, error.message);
  }

  private async markAsFailed(
    id: string,
    attempts: number,
    reason: string,
  ): Promise<void> {
    await this.dataSource.getRepository(OutboxEntity).update(
      { id },
      {
        status: OutboxEventStatus.FAILED,
        attempts,
        failureReason: reason,
        failedAt: new Date(),
        lockedBy: null,
        lockedAt: null,
      },
    );
  }

  private async markForRetry(
    id: string,
    attempts: number,
    reason: string,
  ): Promise<void> {
    const delaySeconds = this.RETRY_DELAYS_SECONDS[attempts - 1] ?? 600;
    const retryAt = new Date(Date.now() + delaySeconds * 1000);

    await this.dataSource.getRepository(OutboxEntity).update(
      { id },
      {
        status: OutboxEventStatus.PENDING,
        attempts,
        failureReason: reason,
        nextRetryAt: retryAt,
        lockedBy: null,
        lockedAt: null,
      },
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
