import { InjectQueue } from '@nestjs/bullmq';
import { PAYMENT_QUEUE } from './constants/constants';
import { Queue } from 'bullmq';
import {
  EventType,
  PaymentEventMap,
} from './interfaces/payment-events.interface';
import { IPaymentQueueService } from './interfaces/payment-queue-service.interface';

export class PaymentQueueService implements IPaymentQueueService {
  constructor(@InjectQueue(PAYMENT_QUEUE) private readonly queue: Queue) {}

  async dispatchEvent<T extends EventType>(
    eventType: T,
    payload: PaymentEventMap[T],
  ): Promise<void> {
    await this.queue.add(eventType, payload, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    });
  }
}
