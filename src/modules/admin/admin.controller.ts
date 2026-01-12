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
import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserSearchQueryDto } from './dto/user-search-query.dto';
import { PaginationResponse } from 'src/common/@types/pagination.types';
import { UserDto } from './dto/user.dto';

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  searchUsers(
    @Query() options: UserSearchQueryDto,
  ): Promise<PaginationResponse<UserDto>> {
    const { search, ...paginationOptions } = options;
    return this.adminService.searchUsers(paginationOptions, search);
  }

  @Post('users/:id/admin')
  @Roles(UserRole.SUPERADMIN)
  async promoteToAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.adminService.promoteToAdmin(id);
    return { message: 'User promoted to admin successfully' };
  }

  @Delete('users/:id/admin')
  @Roles(UserRole.SUPERADMIN)
  async demoteFromAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.adminService.demoteFromAdmin(id);
    return { message: 'User demoted from admin successfully' };
  }
}
