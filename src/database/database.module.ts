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
  PERSONS_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  USERS_REPOSITORY,
} from './repositories/tokens/repository.tokens';
import { CountryEntity } from './entities/country.entity';
import { CountryRepository } from './repositories/country.repository';
import { GenreEntity } from './entities/genre.entity';
import { CreditRoleEntity } from './entities/credit-role.entity';
import { PersonEntity } from './entities/person.entity';

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
    ]),
  ],
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: COUNTRY_REPOSITORY, useClass: CountryRepository },
    { provide: GENRES_REPOSITORY, useClass: GenreEntity },
    { provide: CREDITS_REPOSITORY, useClass: CreditRoleEntity },
    { provide: PERSONS_REPOSITORY, useClass: PersonEntity },
  ],
  exports: [
    USERS_REPOSITORY,
    REFRESH_TOKEN_REPOSITORY,
    COUNTRY_REPOSITORY,
    GENRES_REPOSITORY,
    CREDITS_REPOSITORY,
    PERSONS_REPOSITORY,
  ],
})
export class DatabaseModule {}
