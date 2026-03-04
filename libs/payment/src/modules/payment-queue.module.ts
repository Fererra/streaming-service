import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  PAYMENT_COMMAND_QUEUE,
  PAYMENT_EVENT_QUEUE,
  PAYMENT_QUEUE_SERVICE,
} from '../constants/constants';
import { PaymentQueueService } from '../services/payment-queue.service';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: PAYMENT_EVENT_QUEUE,
        defaultJobOptions: {
          attempts: 7,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        },
      },
      {
        name: PAYMENT_COMMAND_QUEUE,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: true,
        },
      },
    ),
  ],
  providers: [
    { provide: PAYMENT_QUEUE_SERVICE, useClass: PaymentQueueService },
  ],
  exports: [BullModule, PAYMENT_QUEUE_SERVICE],
})
export class PaymentQueueModule {}
