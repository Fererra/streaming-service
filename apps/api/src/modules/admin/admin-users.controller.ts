import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserSearchQueryDto } from '../users/dto/user-search-query.dto';
import { PaginationResponse } from '../../common/@types/pagination.types';
import { UserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/services/users.service';
import { PaymentService } from '../payment/payment.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserSubscriptionApiService } from '../subscription/services/user-subscription-api.service';
import { CancellationInitiator } from '@app/shared';
import { LockTimeoutFilter } from '../../common/filters/lock-timeout.filter';

@Controller('users')
@UseGuards(JwtGuard, RolesGuard)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly paymentService: PaymentService,
    private readonly userSubscriptionService: UserSubscriptionApiService,
  ) {}

  // /users?page=&limit=&
  // /users/search?q=&page=&limit=&
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  searchUsers(
    @Query() options: UserSearchQueryDto,
  ): Promise<PaginationResponse<UserDto>> {
    const { search, ...paginationOptions } = options;
    return this.usersService.searchUsers(paginationOptions, search);
  }

  @Get(':id/subscriptions')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  getUserSubscriptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.userSubscriptionService.getUserSubscriptions(id, pagination);
  }

  @Patch(':id/subscriptions/:subscriptionId/cancel')
  @UseFilters(LockTimeoutFilter)
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    await this.userSubscriptionService.cancelSubscription(
      id,
      subscriptionId,
      CancellationInitiator.ADMIN,
    );

    return { message: 'Subscription cancellation initiated successfully' };
  }

  @Get(':id/payments')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  getUserPayments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<any> {
    return this.paymentService.getUserPayments(id, pagination);
  }

  @Post(':id/admin')
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(200)
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
