import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PAYMENT_EVENT_DLQ } from '../constants/constant';
import { EventType } from '@app/payment';
import { Job } from 'bullmq';
import { EventDlqJobData } from '../interfaces/dlq-payload.interface';

@Processor(PAYMENT_EVENT_DLQ)
export class EventDlqProcessor extends WorkerHost {
  async process(
    job: Job<EventDlqJobData<EventType>, void, EventType>,
  ): Promise<void> {
    const { originalJobId, error, stack } = job.data;

    console.error(
      `DLQ entry: job "${job.name}" (originalId: ${originalJobId}) failed — ${error}`,
      stack,
    );
  }
}
