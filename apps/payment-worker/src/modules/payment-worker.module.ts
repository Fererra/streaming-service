import { Module } from '@nestjs/common';
import { databaseConfig } from '@app/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentWorkerQueueModule } from './payment-worker-queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}.local`,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...databaseConfig(),
      }),
    }),
    PaymentWorkerQueueModule,
  ],
})
export class PaymentWorkerModule {}
