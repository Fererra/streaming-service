import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { TasksModule } from './modules/tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './modules/admin/admin.module';
import { RouterModule } from '@nestjs/core';
import { ReferenceModule } from './modules/reference/reference.module';
import { PersonsModule } from './modules/persons/persons.module';
import { MoviesModule } from './modules/movies/movies.module';
import { UsersModule } from './modules/users/users.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PaymentApiModule } from './modules/payment/payment-api.module';
import { queueConfig } from '@app/config';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}.local`,
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      useFactory: async () => ({
        connection: {
          ...queueConfig(),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    TasksModule,
    AdminModule,
    ReferenceModule,
    PersonsModule,
    MoviesModule,
    SubscriptionModule,
    PaymentApiModule,
    HealthModule,
    RouterModule.register([
      { path: 'admin', module: AdminModule },
      { path: 'payments', module: PaymentApiModule },
    ]),
  ],
})
export class AppModule {}
