import { EventType, PAYMENT_QUEUE } from '@app/payment';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { IPaymentEventHandler } from './interfaces/payment-event-handler.interface';
import { Inject } from '@nestjs/common';
import { PAYMENT_EVENT_HANDLERS } from './constants/constant';
import { Job } from 'bullmq';

@Processor(PAYMENT_QUEUE)
export class PaymentProcessor extends WorkerHost {
  private readonly handlerMap: Map<EventType, IPaymentEventHandler<EventType>>;

  constructor(
    @Inject(PAYMENT_EVENT_HANDLERS)
    private readonly handlers: IPaymentEventHandler<EventType>[],
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
  onFailed(job: Job, error: Error) {
    console.error(`Failed job ${job.id} of type ${job.name}`, error);
  }
}
