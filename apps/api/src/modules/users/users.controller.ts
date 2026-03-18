import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { UsersMediaService } from './services/users-media.service';
import { AllowedImageContentTypesDto } from '../../common/dto/image-content-types.dto';
import { ConfirmAvatarDto } from './dto/confirm-avatar.dto';
import { PaymentService } from '../payment/payment.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserSubscriptionApiService } from '../subscription/services/user-subscription-api.service';
import { LockTimeoutFilter } from '../../common/filters/lock-timeout.filter';

@Controller('users/me')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(
    private readonly usersMediaService: UsersMediaService,
    private readonly paymentService: PaymentService,
    private readonly userSubscriptionService: UserSubscriptionApiService,
  ) {}

  @Patch('avatar/upload-intent')
  updateAvatar(
    @CurrentUserId() userId: string,
    @Body() { contentType }: AllowedImageContentTypesDto,
  ) {
    return this.usersMediaService.updateAvatar(userId, contentType);
  }

  @Post('avatar/confirm')
  async confirmAvatar(
    @CurrentUserId() userId: string,
    @Body() { storageKey }: ConfirmAvatarDto,
  ) {
    await this.usersMediaService.confirmAvatar(userId, storageKey);

    return { message: 'Avatar updated successfully' };
  }

  @Get('subscriptions')
  getSubscriptions(
    @CurrentUserId() userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.userSubscriptionService.getUserSubscriptions(
      userId,
      pagination,
    );
  }

  @Patch('subscriptions/:subscriptionId/cancel')
  @UseFilters(LockTimeoutFilter)
  async cancelSubscription(
    @CurrentUserId() userId: string,
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ) {
    await this.userSubscriptionService.cancelSubscription(
      userId,
      subscriptionId,
    );

    return { message: 'Subscription cancellation initiated successfully' };
  }

  @Get('payments')
  getPayments(
    @CurrentUserId() userId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.paymentService.getUserPayments(userId, pagination);
  }
}
