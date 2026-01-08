import { UserEntity } from 'src/database/entities/user.entity';
import { AuthUser } from 'src/modules/auth/types/auth-user.type';

export interface IUsersRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  existsById(userId: string): Promise<boolean>;
  createUser(data: Partial<UserEntity>): Promise<UserEntity>;
  resolveAuthUser(userId: string): Promise<AuthUser | null>;
}
