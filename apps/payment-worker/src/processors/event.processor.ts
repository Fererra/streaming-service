import { EventType, PAYMENT_EVENT_QUEUE } from '@app/payment';
import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { IPaymentEventHandler } from '../interfaces/payment-event-handler.interface';
import { Inject } from '@nestjs/common';
import {
  PAYMENT_EVENT_DLQ,
  PAYMENT_EVENT_HANDLERS,
} from '../constants/constant';
import { Job, Queue } from 'bullmq';

@Processor(PAYMENT_EVENT_QUEUE)
export class PaymentEventProcessor extends WorkerHost {
  private readonly handlerMap: Map<EventType, IPaymentEventHandler<EventType>>;

  constructor(
    @Inject(PAYMENT_EVENT_HANDLERS)
    private readonly handlers: IPaymentEventHandler<EventType>[],
    @InjectQueue(PAYMENT_EVENT_DLQ) private readonly eventDlq: Queue,
  ) {
    super();

    this.handlerMap = new Map(
      this.handlers.map((handler) => [handler.eventType, handler] as const),
    );
  }

  async process(job: Job<any, any, EventType>): Promise<void> {
    const handler = this.handlerMap.get(job.name);

    if (!handler) {
      console.warn(`No handler found for event type: ${job.name}`);
      return;
    }

    try {
      await handler.handle(job.data);
    } catch (error) {
      console.error(`Error handling event type: ${job.name}`, error);
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

      await this.eventDlq.add(job.name, {
        originalJobId: job.id,
        payload: job.data,
        error: error.message,
        stack: error.stack,
        failedAt: new Date().toISOString(),
      });
    }
  }
}
