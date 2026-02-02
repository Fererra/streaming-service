import { Module } from '@nestjs/common';
import { MoviesService } from './services/movies.service';
import { MoviesController } from './movies.controller';
import { DatabaseModule } from 'src/database/database.module';
import { PersonsModule } from '../persons/persons.module';
import { ReferenceModule } from '../reference/reference.module';
import { MoviesMediaService } from './services/movies-media.service';
import { StorageModule } from '../storage/storage.module';
import { MovieCreditsService } from './services/movie-credits.service';
import { MovieMapper } from './mappers/movie.mapper';
import { CreditEntityFactory } from './factories/credit-entity.factory';

@Module({
  imports: [DatabaseModule, StorageModule, PersonsModule, ReferenceModule],
  controllers: [MoviesController],
  providers: [
    MoviesService,
    MoviesMediaService,
    MovieCreditsService,
    MovieMapper,
    CreditEntityFactory,
  ],
  exports: [MoviesService, MoviesMediaService, MovieCreditsService],
})
export class MoviesModule {}
