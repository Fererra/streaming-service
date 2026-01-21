import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CountryModule } from './modules/country/country.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './modules/admin/admin.module';
import { RouterModule } from '@nestjs/core';
import { GenresModule } from './modules/genres/genres.module';
import { CreditsModule } from './modules/credits/credits.module';

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
    AdminModule,
    RouterModule.register([{ path: 'admin', module: AdminModule }]),
    GenresModule,
    CreditsModule,
  ],
})
export class AppModule {}
