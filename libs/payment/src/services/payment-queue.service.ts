import { InjectQueue } from '@nestjs/bullmq';
import {
  PAYMENT_COMMAND_QUEUE,
  PAYMENT_EVENT_QUEUE,
} from '../constants/constants';
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
    @InjectQueue(PAYMENT_EVENT_QUEUE) private readonly eventQueue: Queue,
    @InjectQueue(PAYMENT_COMMAND_QUEUE) private readonly commandQueue: Queue,
  ) {}

  async dispatchEvent<T extends EventType>(
    eventType: T,
    payload: EventPayload<T>,
  ): Promise<void> {
    await this.eventQueue.add(eventType, payload);
  }

  async dispatchCommand<T extends CommandType>(
    eventType: T,
    payload: CommandPayload<T>,
  ): Promise<void> {
    await this.commandQueue.add(eventType, payload);
  }

  async dispatchCommandsBulk<T extends CommandType>(
    commands: { name: T; data: CommandPayload<T> }[],
  ): Promise<void> {
    await this.commandQueue.addBulk(
      commands.map((cmd) => ({
        name: cmd.name,
        data: cmd.data,
      })),
    );
  }
}
