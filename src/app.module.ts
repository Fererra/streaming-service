import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CountryModule } from './modules/country/country.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './modules/admin/admin.module';
import { RouterModule } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}.local`,
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    CountryModule,
    TasksModule,
    RouterModule.register([{ path: 'admin', module: AdminModule }]),
  ],
})
export class AppModule {}
