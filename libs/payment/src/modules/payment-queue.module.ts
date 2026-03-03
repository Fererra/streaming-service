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
      { name: PAYMENT_EVENT_QUEUE },
      { name: PAYMENT_COMMAND_QUEUE },
    ),
  ],
  providers: [
    { provide: PAYMENT_QUEUE_SERVICE, useClass: PaymentQueueService },
  ],
  exports: [BullModule, PAYMENT_QUEUE_SERVICE],
})
export class PaymentQueueModule {}
