import { Module } from '@nestjs/common';
import { MoviesService } from './services/movies.service';
import { MoviesController } from './movies.controller';
import { DatabaseModule } from '../../database/database.module';
import { PersonsModule } from '../persons/persons.module';
import { ReferenceModule } from '../reference/reference.module';
import { MoviesMediaService } from './services/movies-media.service';
import { StorageModule } from '../storage/storage.module';
import { MoviesCreditsService } from './services/movies-credits.service';
import { MovieMapper } from './mappers/movie.mapper';
import { CreditEntityFactory } from './factories/credit-entity.factory';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ActiveSubscriptionGuard } from '../auth/guards/active-subscription.guard';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    PersonsModule,
    ReferenceModule,
    SubscriptionModule,
  ],
  controllers: [MoviesController],
  providers: [
    MoviesService,
    MoviesMediaService,
    MoviesCreditsService,
    MovieMapper,
    CreditEntityFactory,
    ActiveSubscriptionGuard,
  ],
  exports: [MoviesService, MoviesMediaService, MoviesCreditsService],
})
export class MoviesModule {}
