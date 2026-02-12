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
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}.local`,
      isGlobal: true,
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
    PaymentModule,
    RouterModule.register([
      { path: 'admin', module: AdminModule },
      { path: 'payments', module: PaymentModule },
    ]),
  ],
})
export class AppModule {}
