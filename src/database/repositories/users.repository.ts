import { ILike, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import type { AuthUser } from 'src/modules/auth/types/auth-user.type';
import type { IUsersRepository } from './interfaces/users-repository.interface';
import { UserRole } from 'src/modules/users/user-role.enum';
import type {
  PaginationOptions,
  RepositoryPaginatedResult,
} from 'src/common/@types/pagination.types';
import { isUUID } from 'class-validator';
import { NotFoundException } from '@nestjs/common';

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

  findByUserId(userId: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      select: ['id', 'role'],
      where: { id: userId },
    });
  }

  searchUsers(
    options: PaginationOptions,
    search?: string,
  ): Promise<RepositoryPaginatedResult<UserEntity>> {
    const where = search
      ? [
          { firstName: ILike(`%${search}%`) },
          { lastName: ILike(`%${search}%`) },
          ...(isUUID(search) ? [{ id: search }] : []),
        ]
      : undefined;

    const skip = (options.page - 1) * options.limit;
    const take = options.limit;

    return this.repository.findAndCount({
      select: ['id', 'firstName', 'lastName', 'avatarPath'],
      where,
      skip,
      take,
    });
  }

  existsById(userId: string): Promise<boolean> {
    return this.repository.existsBy({ id: userId });
  }

  createUser(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async getAvatarPath(userId: string): Promise<string | null> {
    const user = await this.repository.findOne({
      select: ['avatarPath'],
      where: { id: userId },
    });

    return user?.avatarPath ?? null;
  }

  async update(id: string, data: Partial<UserEntity>): Promise<void> {
    await this.repository.update({ id }, data);
  }

  async swapAvatarPath(
    userId: string,
    newAvatarPath: string,
  ): Promise<string | null> {
    return this.repository.manager.transaction(async (manager) => {
      const user = await manager.findOne(UserEntity, {
        select: ['id', 'avatarPath'],
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const oldAvatarPath = user.avatarPath;

      await manager.update(
        UserEntity,
        { id: userId },
        { avatarPath: newAvatarPath },
      );

      return oldAvatarPath;
    });
  }

  resolveAuthUser(userId: string): Promise<AuthUser | null> {
    return this.repository.findOne({
      select: ['id', 'role'],
      where: { id: userId },
    });
  }

  async promoteToAdmin(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { role: UserRole.ADMIN });
  }

  async demoteFromAdmin(userId: string): Promise<void> {
    await this.repository.update({ id: userId }, { role: UserRole.USER });
  }
}
