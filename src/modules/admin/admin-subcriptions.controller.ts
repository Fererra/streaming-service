import {
  Body,
  Controller,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
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

@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('subscriptions')
export class AdminSubscriptionsController {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
    private readonly subscriptionOfferService: SubscriptionOfferService,
  ) {}

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
}
