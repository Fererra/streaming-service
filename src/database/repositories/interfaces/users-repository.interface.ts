import type {
  PaginationOptions,
  RepositoryPaginatedResult,
} from 'src/common/@types/pagination.types';
import { UserEntity } from 'src/database/entities/user.entity';
import { AuthUser } from 'src/modules/auth/types/auth-user.type';

export interface IUsersRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUserId(userId: string): Promise<UserEntity | null>;
  searchUsers(
    options: PaginationOptions,
    search?: string,
  ): Promise<RepositoryPaginatedResult<UserEntity>>;
  existsById(userId: string): Promise<boolean>;
  getAvatarPath(userId: string): Promise<string | null>;
  update(userId: string, data: Partial<UserEntity>): Promise<void>;
  createUser(data: Partial<UserEntity>): Promise<UserEntity>;
  resolveAuthUser(userId: string): Promise<AuthUser | null>;
  promoteToAdmin(userId: string): Promise<void>;
  demoteFromAdmin(userId: string): Promise<void>;
}
