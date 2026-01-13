import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserSearchQueryDto } from '../users/dto/user-search-query.dto';
import { PaginationResponse } from 'src/common/@types/pagination.types';
import { UserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';

@Controller('users')
@UseGuards(JwtGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  searchUsers(
    @Query() options: UserSearchQueryDto,
  ): Promise<PaginationResponse<UserDto>> {
    const { search, ...paginationOptions } = options;
    return this.usersService.searchUsers(paginationOptions, search);
  }

  @Post(':id/admin')
  @Roles(UserRole.SUPERADMIN)
  async promoteToAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.usersService.promoteToAdmin(id);
    return { message: 'User promoted to admin successfully' };
  }

  @Delete(':id/admin')
  @Roles(UserRole.SUPERADMIN)
  async demoteFromAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.usersService.demoteFromAdmin(id);
    return { message: 'User demoted from admin successfully' };
  }
}
