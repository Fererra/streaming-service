import { Module } from '@nestjs/common';
import { PAYMENT_COMMAND_DLQ, PAYMENT_EVENT_DLQ } from '../constants/constant';
import { BullModule } from '@nestjs/bullmq';
import { queueConfig } from '@app/config';
import { PaymentCommandProcessor } from '../processors/command.processor';
import { CommandDlqProcessor } from '../processors/command-dlq.processor';
import { PaymentEventProcessor } from '../processors/event.processor';
import { EventDlqProcessor } from '../processors/event-dlq.processor';
import { PaymentWorkerHandlersModule } from './payment-worker-handlers.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: async () => ({
        connection: {
          ...queueConfig(),
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: PAYMENT_COMMAND_DLQ,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
        },
      },
      {
        name: PAYMENT_EVENT_DLQ,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
        },
      },
    ),
    PaymentWorkerHandlersModule,
  ],
  providers: [
    PaymentCommandProcessor,
    CommandDlqProcessor,
    PaymentEventProcessor,
    EventDlqProcessor,
  ],
})
export class PaymentWorkerQueueModule {}
