import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.enum';
import type {
  PaginationOptions,
  PaginationResponse,
} from 'src/common/@types/pagination.types';
import { buildPaginationResponse } from 'src/common/utils/pagination.util';
import { UserDto } from './dto/user.dto';

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) {}

  async searchUsers(
    paginationOptions: PaginationOptions,
    search?: string,
  ): Promise<PaginationResponse<UserDto>> {
    const [users, total] = await this.usersService.searchUsers(
      paginationOptions,
      search,
    );

    return buildPaginationResponse(users, total, paginationOptions);
  }

  async promoteToAdmin(userId: string): Promise<void> {
    const user = await this.usersService.findByUserId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ConflictException('User is already an admin');
    }

    await this.usersService.promoteToAdmin(userId);
  }

  async demoteFromAdmin(userId: string): Promise<void> {
    const user = await this.usersService.findByUserId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ConflictException('User is not an admin');
    }

    await this.usersService.demoteFromAdmin(userId);
  }
}
