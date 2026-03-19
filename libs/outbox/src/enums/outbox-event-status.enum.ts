export enum OutboxEventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  RETRYING = 'retrying',
  PUBLISHED = 'published',
  FAILED = 'failed',
}
