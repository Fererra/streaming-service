import { InjectQueue } from '@nestjs/bullmq';
import { PAYMENT_EVENT_QUEUE } from '../constants/constants';
import { Queue } from 'bullmq';
import {
  EventPayload,
  EventType,
} from '../interfaces/payment-events.interface';
import { IPaymentQueueService } from '../interfaces/payment-queue-service.interface';
import {
  CommandPayload,
  CommandType,
} from '../interfaces/payment-command.interface';

export class PaymentQueueService implements IPaymentQueueService {
  constructor(
    @InjectQueue(PAYMENT_EVENT_QUEUE) private readonly queue: Queue,
  ) {}

  async dispatchEvent<T extends EventType>(
    eventType: T,
    payload: EventPayload<T>,
  ): Promise<void> {
    await this.queue.add(eventType, payload, {
      attempts: 7,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    });
  }

  async dispatchCommand<T extends CommandType>(
    eventType: T,
    payload: CommandPayload<T>,
  ): Promise<void> {
    await this.queue.add(eventType, payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: true,
    });
  }
}
