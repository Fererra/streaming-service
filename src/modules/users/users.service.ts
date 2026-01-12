import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserEntity } from 'src/database/entities/user.entity';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { IUsersRepository } from 'src/database/repositories/interfaces/users-repository.interface';
import { USERS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import type {
  PaginationOptions,
  RepositoryPaginatedResult,
} from 'src/common/@types/pagination.types';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  findByUserId(userId: string): Promise<UserEntity | null> {
    return this.usersRepository.findByUserId(userId);
  }

  searchUsers(
    paginationOptions: PaginationOptions,
    search?: string,
  ): Promise<RepositoryPaginatedResult<UserEntity>> {
    return this.usersRepository.searchUsers(paginationOptions, search);
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

  async promoteToAdmin(userId: string): Promise<void> {
    await this.usersRepository.promoteToAdmin(userId);
  }

  async demoteFromAdmin(userId: string): Promise<void> {
    await this.usersRepository.demoteFromAdmin(userId);
  }
}
