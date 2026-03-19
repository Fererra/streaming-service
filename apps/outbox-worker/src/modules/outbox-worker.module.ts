import { Module } from '@nestjs/common';
import { OutboxPoller } from '../services/outbox.worker';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig, queueConfig } from '@app/config';
import { PaymentQueueModule } from '@app/payment';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: async () => ({
        connection: {
          ...queueConfig(),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...databaseConfig(),
      }),
    }),
    PaymentQueueModule,
  ],
  providers: [OutboxPoller],
})
export class OutboxWorkerModule {}
