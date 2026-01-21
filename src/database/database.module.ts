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
  REFRESH_TOKEN_REPOSITORY,
  USERS_REPOSITORY,
} from './repositories/tokens/repository.tokens';
import { CountryEntity } from './entities/country.entity';
import { CountryRepository } from './repositories/country.repository';
import { GenresRepository } from './repositories/genres.repository';
import { GenreEntity } from './entities/genre.entity';
import { CreditRoleEntity } from './entities/credit-role.entity';
import { CreditsRepository } from './repositories/credits.repository';

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
    ]),
  ],
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: COUNTRY_REPOSITORY, useClass: CountryRepository },
    { provide: GENRES_REPOSITORY, useClass: GenresRepository },
    { provide: CREDITS_REPOSITORY, useClass: CreditsRepository },
  ],
  exports: [
    USERS_REPOSITORY,
    REFRESH_TOKEN_REPOSITORY,
    COUNTRY_REPOSITORY,
    GENRES_REPOSITORY,
    CREDITS_REPOSITORY,
  ],
})
export class DatabaseModule {}
