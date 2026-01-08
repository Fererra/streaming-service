import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserEntity } from 'src/database/entities/user.entity';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { IUsersRepository } from 'src/database/repositories/interfaces/users-repository.interface';
import { USERS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  existsById(userId: string): Promise<boolean> {
    return this.usersRepository.existsById(userId);
  }

  createUser(data: Partial<UserEntity>): Promise<UserEntity> {
    return this.usersRepository.createUser(data);
  }

  async resolveAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.usersRepository.resolveAuthUser(userId);

    if (!user) throw new UnauthorizedException('User not found');

    return user;
  }
}
