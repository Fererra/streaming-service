import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import AppDataSource from './data-source';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import {
  REFRESH_TOKEN_REPOSITORY,
  USERS_REPOSITORY,
} from './repositories/tokens/repository.tokens';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...AppDataSource.options,
      }),
    }),
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
  ],
  providers: [
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
  ],
  exports: [USERS_REPOSITORY, REFRESH_TOKEN_REPOSITORY],
})
export class DatabaseModule {}
