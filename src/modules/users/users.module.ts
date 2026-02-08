import { Global, Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { DatabaseModule } from 'src/database/database.module';
import { UsersController } from './users.controller';
import { StorageModule } from '../storage/storage.module';
import { UsersMediaService } from './services/users-media.service';

@Global()
@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService, UsersMediaService],
  exports: [UsersService],
})
export class UsersModule {}
