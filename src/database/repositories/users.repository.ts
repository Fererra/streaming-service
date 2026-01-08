import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import type { AuthUser } from 'src/modules/auth/types/auth-user.type';
import type { IUsersRepository } from './interfaces/users-repository.interface';

export class UsersRepository implements IUsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      select: ['id', 'role', 'password'],
      where: { email },
    });
  }

  existsById(userId: string): Promise<boolean> {
    return this.repository.existsBy({ id: userId });
  }

  createUser(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  resolveAuthUser(userId: string): Promise<AuthUser | null> {
    return this.repository.findOne({
      select: ['id', 'role'],
      where: { id: userId },
    });
  }
}
