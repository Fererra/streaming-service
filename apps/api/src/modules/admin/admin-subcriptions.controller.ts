import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionPlanService } from '../subscription/services/subscription-plan.service';
import { SubscriptionOfferService } from '../subscription/services/subscription-offer.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import {
  CreateOfferDto,
  CreateSubscriptionDto,
} from '../subscription/dto/create-subscription.dto';
import { CheckEmptyBodyPipe } from '../../common/pipes/check-empty-body.pipe';
import { UpdateSubscriptionDto } from '../subscription/dto/update-subscription.dto';
import { LockTimeoutFilter } from '../../common/filters/lock-timeout.filter';

@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('subscriptions')
export class AdminSubscriptionsController {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly subscriptionOfferService: SubscriptionOfferService,
  ) {}

  @Get()
  getAllSubscriptions() {
    return this.subscriptionPlanService.findAllWithOffersForAdmin();
  }

  @Post()
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    await this.subscriptionPlanService.create(createSubscriptionDto);

    return {
      message: `Process of creating subscription plan is in progress`,
    };
  }

  @Patch(':id')
  @UseFilters(LockTimeoutFilter)
  async updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(CheckEmptyBodyPipe)
    updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    await this.subscriptionPlanService.update(id, updateSubscriptionDto);

    return {
      message: `Update of subscription plan is in progress`,
    };
  }

  @Post(':id/offers')
  async createOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ParseArrayPipe({ items: CreateOfferDto }))
    createOffersDto: CreateOfferDto[],
  ) {
    await this.subscriptionOfferService.createOffersAndSync(
      id,
      createOffersDto,
    );

    return {
      message: `Process of creating offers for subscription plan is in progress`,
    };
  }

  @Patch(':id/activate')
  @UseFilters(LockTimeoutFilter)
  async activatePlan(@Param('id', ParseUUIDPipe) id: string) {
    await this.subscriptionPlanService.activatePlan(id);

    return {
      message: `Plan activating is in progress`,
    };
  }

  @Patch(':id/deactivate')
  @UseFilters(LockTimeoutFilter)
  async deactivatePlan(@Param('id', ParseUUIDPipe) id: string) {
    await this.subscriptionPlanService.deactivatePlan(id);

    return {
      message: `Plan deactivating is in progress`,
    };
  }

  @Patch(':planId/offers/:offerId/deactivate')
  @UseFilters(LockTimeoutFilter)
  async deactivateOffer(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    await this.subscriptionOfferService.deactivateOffer(planId, offerId);

    return {
      message: `Offer deactivating is in progress`,
    };
  }
}
