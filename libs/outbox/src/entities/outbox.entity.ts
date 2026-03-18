import { CommandPayload, CommandType } from '@app/payment';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OutboxEventStatus } from '../enums/outbox-event-status.enum';

export type OutboxRecordType = CommandType;
export type OutboxRecordPayload = CommandPayload<OutboxRecordType>;

@Entity('outbox')
export class OutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  type: OutboxRecordType;

  @Column({ type: 'jsonb' })
  payload: OutboxRecordPayload;

  @Column({
    type: 'enum',
    enum: OutboxEventStatus,
    enumName: 'outbox_event_status',
    default: OutboxEventStatus.PENDING,
  })
  status: OutboxEventStatus;

  @Column({ name: 'locked_at', type: 'timestamp', nullable: true })
  lockedAt: Date | null;

  @Column({ name: 'locked_by', type: 'varchar', length: 100, nullable: true })
  lockedBy: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
