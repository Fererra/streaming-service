import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { PersonsModule } from '../persons/persons.module';
import { AdminPersonsController } from './admin-persons.controller';
import { AdminMoviesController } from './admin-movies.controller';
import { MoviesModule } from '../movies/movies.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AdminSubscriptionsController } from './admin-subcriptions.controller';

@Module({
  imports: [PersonsModule, MoviesModule, SubscriptionModule],
  controllers: [
    AdminUsersController,
    AdminPersonsController,
    AdminMoviesController,
    AdminSubscriptionsController,
  ],
})
export class AdminModule {}
