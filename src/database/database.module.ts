import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import AppDataSource from './data-source';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RefreshTokenEntity } from './entities/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...AppDataSource.options,
      }),
    }),
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
  ],
  providers: [UsersRepository, RefreshTokenRepository],
  exports: [UsersRepository, RefreshTokenRepository],
})
export class DatabaseModule {}
