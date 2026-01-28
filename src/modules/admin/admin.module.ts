import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersModule } from '../users/users.module';
import { PersonsModule } from '../persons/persons.module';
import { AdminPersonsController } from './admin-persons.controller';
import { AdminMoviesController } from './admin-movies.controller';
import { AdminMoviesService } from './admin-movies.service';
import { ReferenceModule } from '../reference/reference.module';

@Module({
  imports: [UsersModule, PersonsModule, ReferenceModule],
  providers: [AdminMoviesService],
  controllers: [
    AdminUsersController,
    AdminPersonsController,
    AdminMoviesController,
  ],
})
export class AdminModule {}
