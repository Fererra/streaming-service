import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PAYMENT_COMMAND_DLQ } from '../constants/constant';
import { CommandType } from '@app/payment';
import { Job } from 'bullmq';
import { CommandDlqJobData } from '../interfaces/dlq-payload.interface';

@Processor(PAYMENT_COMMAND_DLQ)
export class CommandDlqProcessor extends WorkerHost {
  async process(
    job: Job<CommandDlqJobData<CommandType>, void, CommandType>,
  ): Promise<void> {
    const { originalJobId, error, stack } = job.data;

    console.error(
      `DLQ entry: job "${job.name}" (originalId: ${originalJobId}) failed — ${error}`,
      stack,
    );
  }
}
