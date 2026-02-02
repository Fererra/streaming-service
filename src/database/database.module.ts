import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import AppDataSource from './data-source';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import {
  COUNTRY_REPOSITORY,
  CREDITS_REPOSITORY,
  GENRES_REPOSITORY,
  MOVIE_CREDITS_REPOSITORY,
  MOVIES_REPOSITORY,
  PERSONS_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  USERS_REPOSITORY,
} from './repositories/tokens/repository.tokens';
import { CountryEntity } from './entities/country.entity';
import { CountryRepository } from './repositories/country.repository';
import { GenreEntity } from './entities/genre.entity';
import { CreditRoleEntity } from './entities/credit-role.entity';
import { PersonEntity } from './entities/person.entity';
import { PersonsRepository } from './repositories/persons.repository';
import { GenresRepository } from './repositories/genres.repository';
import { CreditsRepository } from './repositories/credits.repository';
import { MoviesRepository } from './repositories/movies.repository';
import { MovieEntity } from './entities/movie.entity';
import { MovieCreditEntity } from './entities/movie-credit.entity';
import { MovieCreditsRepository } from './repositories/movie-credits.repository';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...AppDataSource.options,
      }),
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      RefreshTokenEntity,
      CountryEntity,
      GenreEntity,
      CreditRoleEntity,
      PersonEntity,
      MovieEntity,
      MovieCreditEntity,
    ]),
  ],
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: COUNTRY_REPOSITORY, useClass: CountryRepository },
    { provide: GENRES_REPOSITORY, useClass: GenresRepository },
    { provide: CREDITS_REPOSITORY, useClass: CreditsRepository },
    { provide: PERSONS_REPOSITORY, useClass: PersonsRepository },
    { provide: MOVIES_REPOSITORY, useClass: MoviesRepository },
    { provide: MOVIE_CREDITS_REPOSITORY, useClass: MovieCreditsRepository },
  ],
  exports: [
    USERS_REPOSITORY,
    REFRESH_TOKEN_REPOSITORY,
    COUNTRY_REPOSITORY,
    GENRES_REPOSITORY,
    CREDITS_REPOSITORY,
    PERSONS_REPOSITORY,
    MOVIES_REPOSITORY,
    MOVIE_CREDITS_REPOSITORY,
  ],
})
export class DatabaseModule {}
