import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersModule } from '../users/users.module';
import { PersonsModule } from '../persons/persons.module';
import { AdminPersonsController } from './admin-persons.controller';
import { AdminMoviesController } from './admin-movies.controller';
import { MoviesModule } from '../movies/movies.module';

@Module({
  imports: [UsersModule, PersonsModule, MoviesModule],
  controllers: [
    AdminUsersController,
    AdminPersonsController,
    AdminMoviesController,
  ],
})
export class AdminModule {}
