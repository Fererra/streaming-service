import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CheckEmptyBodyPipe } from 'src/common/pipes/check-empty-body.pipe';
import {
  UpdateOfferDto,
  UpdateSubscriptionDto,
} from '../subscription/dto/update-subscription.dto';

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
    throw new NotImplementedException();
  }

  @Post()
  async createSubscription(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    const subscription = await this.subscriptionPlanService.create(
      createSubscriptionDto,
    );

    return {
      subscriptionId: subscription.id,
      message: `Subscription ${subscription.name} created successfully`,
    };
  }

  @Patch(':id')
  async updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(CheckEmptyBodyPipe)
    updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    await this.subscriptionPlanService.update(id, updateSubscriptionDto);

    return {
      message: `Subscription updated successfully`,
    };
  }

  @Post(':id/offers')
  async createOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ParseArrayPipe({ items: CreateOfferDto }))
    createOffersDto: CreateOfferDto[],
  ) {
    await this.subscriptionOfferService.attachOffersToPlan(id, createOffersDto);

    return {
      message: `Offers successfully attached to subscription`,
    };
  }

  @Patch(':planId/offers/:offerId')
  async updateOffers(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body(CheckEmptyBodyPipe) updateOfferDto: UpdateOfferDto,
  ) {
    await this.subscriptionOfferService.update(planId, offerId, updateOfferDto);

    return {
      message: `Offers successfully updated`,
    };
  }

  @Patch(':id/activate')
  async activatePlan(@Param('id', ParseUUIDPipe) id: string) {
    await this.subscriptionPlanService.activatePlan(id);

    return {
      message: `Subscription plan activated successfully`,
    };
  }

  @Patch(':id/deactivate')
  async deactivatePlan(@Param('id', ParseUUIDPipe) id: string) {
    await this.subscriptionPlanService.deactivatePlan(id);

    return {
      message: `Subscription plan deactivated successfully`,
    };
  }

  @Patch(':planId/offers/:offerId/activate')
  async activateOffer(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    await this.subscriptionOfferService.activateOffer(planId, offerId);

    return {
      message: `Offer activated successfully`,
    };
  }

  @Patch(':planId/offers/:offerId/deactivate')
  async deactivateOffer(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    await this.subscriptionOfferService.deactivateOffer(planId, offerId);

    return {
      message: `Offer deactivated successfully`,
    };
  }
}
