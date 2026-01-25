import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import AppDataSource from './data-source';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import {
  COUNTRY_REPOSITORY,
  PERSONS_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  USERS_REPOSITORY,
} from './repositories/tokens/repository.tokens';
import { CountryEntity } from './entities/country.entity';
import { CountryRepository } from './repositories/country.repository';
import { PersonEntity } from './entities/person.entity';
import { PersonsRepository } from './repositories/persons.repository';

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
      PersonEntity,
    ]),
  ],
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    { provide: COUNTRY_REPOSITORY, useClass: CountryRepository },
    { provide: PERSONS_REPOSITORY, useClass: PersonsRepository },
  ],
  exports: [
    USERS_REPOSITORY,
    REFRESH_TOKEN_REPOSITORY,
    COUNTRY_REPOSITORY,
    PERSONS_REPOSITORY,
  ],
})
export class DatabaseModule {}
