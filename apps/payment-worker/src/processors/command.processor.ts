import { CommandPayload, PAYMENT_COMMAND_QUEUE } from '@app/payment';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { CommandType } from '@app/payment';
import { IPaymentCommandHandler } from '../interfaces/payment-command-handler.interface';
import { Inject } from '@nestjs/common';
import {
  PAYMENT_COMMAND_DLQ,
  PAYMENT_COMMAND_HANDLERS,
} from '../constants/constant';

@Processor(PAYMENT_COMMAND_QUEUE, {
  limiter: {
    max: 15,
    duration: 1000,
  },
  concurrency: 5,
})
export class PaymentCommandProcessor extends WorkerHost {
  private readonly handlerMap: Map<
    CommandType,
    IPaymentCommandHandler<CommandType>
  >;

  constructor(
    @Inject(PAYMENT_COMMAND_HANDLERS)
    private readonly commandHandlers: IPaymentCommandHandler<CommandType>[],
    @InjectQueue(PAYMENT_COMMAND_DLQ) private readonly commandDlq: Queue,
  ) {
    super();

    this.handlerMap = new Map(
      this.commandHandlers.map(
        (handler) => [handler.commandType, handler] as const,
      ),
    );
  }

  async process(
    job: Job<CommandPayload<any>, void, CommandType>,
  ): Promise<void> {
    if (!job.id) {
      throw new Error(
        `Critical: Job missing ID in process method. Payload: ${JSON.stringify(job.data)}`,
      );
    }

    const handler = this.handlerMap.get(job.name);

    if (!handler) {
      console.warn(`No handler found for command type: ${job.name}`);
      return;
    }

    try {
      await handler.handle(job.data);
    } catch (error) {
      console.error(
        `Error occurred while processing job ${job.id} of type ${job.name}`,
        error,
      );
      throw error;
    }
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
  async onFailed(job: Job, error: Error) {
    console.error(`Failed job ${job.id} of type ${job.name}`, error);

    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      console.error(
        `Job ${job.id} of type ${job.name} has reached max attempts. Moving to DLQ.`,
      );

      await this.commandDlq.add(job.name, {
        originalJobId: job.id,
        payload: job.data,
        error: error.message,
        stack: error.stack,
        failedAt: new Date().toISOString(),
      });
    }
  }
}
