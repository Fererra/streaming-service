import { Module } from '@nestjs/common';
import { PersonsService } from './services/persons.service';
import { PersonsController } from './persons.controller';
import { DatabaseModule } from '../../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { PersonsMediaService } from './services/persons-media.service';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [PersonsController],
  providers: [PersonsService, PersonsMediaService],
  exports: [PersonsService, PersonsMediaService],
})
export class PersonsModule {}
