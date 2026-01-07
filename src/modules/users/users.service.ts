import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserEntity } from 'src/database/entities/user.entity';
import { UsersRepository } from 'src/database/repositories/users.repository';
import type { AuthUser } from '../auth/types/auth-user.type';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

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
