import { Controller, Get } from '@nestjs/common';
import { SubscriptionPlanService } from './services/subscription-plan.service';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
  ) {}

  @Get()
  getAllSubscriptions() {
    return this.subscriptionPlanService.findAllWithOffersForUser();
  }
}
