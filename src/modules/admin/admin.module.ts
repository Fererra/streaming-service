import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersModule } from '../users/users.module';
import { PersonsModule } from '../persons/persons.module';
import { AdminPersonsController } from './admin-persons.controller';

@Module({
  imports: [UsersModule, PersonsModule],
  controllers: [AdminUsersController, AdminPersonsController],
})
export class AdminModule {}
