import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { DatabaseModule } from 'src/database/database.module';
import { PersonsModule } from '../persons/persons.module';
import { ReferenceModule } from '../reference/reference.module';
import { MoviesMediaService } from './movies-media.service';

@Module({
  imports: [DatabaseModule, PersonsModule, ReferenceModule],
  controllers: [MoviesController],
  providers: [MoviesService, MoviesMediaService],
  exports: [MoviesService, MoviesMediaService],
})
export class MoviesModule {}
