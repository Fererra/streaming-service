import { CommandPayload, PAYMENT_COMMAND_QUEUE } from '@app/payment';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CommandType } from '@app/payment';
import { PaymentCommandHandlersRegistry } from '../handlers/commands/command-handle.registry';

@Processor(PAYMENT_COMMAND_QUEUE, {
  limiter: {
    max: 15,
    duration: 1000,
  },
  concurrency: 5,
})
export class PaymentCommandProcessor extends WorkerHost {
  constructor(
    private readonly commandHandlersRegistry: PaymentCommandHandlersRegistry,
  ) {
    super();
  }

  async process(
    job: Job<CommandPayload<any>, void, CommandType>,
  ): Promise<void> {
    if (!job.id) {
      throw new Error(
        `Critical: Job missing ID in process method. Payload: ${JSON.stringify(job.data)}`,
      );
    }

    const handler = this.commandHandlersRegistry.get(job.name);
    await handler(job.data, { jobId: job.id });
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(`Failed job ${job.id} of type ${job.name}`, error);
  }
}
