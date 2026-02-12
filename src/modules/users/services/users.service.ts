import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserEntity } from 'src/database/entities/user.entity';
import type { AuthUser } from '../../auth/types/auth-user.type';
import type { IUsersRepository } from 'src/database/repositories/interfaces/users-repository.interface';
import { USERS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import type {
  PaginationOptions,
  PaginationResponse,
} from 'src/common/@types/pagination.types';
import { UserRole } from '../user-role.enum';
import { buildPaginationResponse } from 'src/common/utils/pagination.util';
import { UserDto } from '../dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  findUserEmailById(userId: string): Promise<string | null> {
    return this.usersRepository.findUserEmailById(userId);
  }

  async searchUsers(
    paginationOptions: PaginationOptions,
    search?: string,
  ): Promise<PaginationResponse<UserDto>> {
    const [users, total] = await this.usersRepository.searchUsers(
      paginationOptions,
      search,
    );

    return buildPaginationResponse(users, total, paginationOptions);
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
    const user = await this.usersRepository.findByUserId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ConflictException('User is already an admin');
    }

    await this.usersRepository.promoteToAdmin(userId);
  }

  async demoteFromAdmin(userId: string): Promise<void> {
    const user = await this.usersRepository.findByUserId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ConflictException('User is not an admin');
    }

    await this.usersRepository.demoteFromAdmin(userId);
  }
}
