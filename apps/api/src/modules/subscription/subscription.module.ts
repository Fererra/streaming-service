import { Module } from '@nestjs/common';
import { SubscriptionPlanService } from './services/subscription-plan.service';
import { SubscriptionOfferService } from './services/subscription-offer.service';
import { OfferEntityFactory } from './factories/offer-entity.factory';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionLibPersistenceModule } from '@app/subscription';
import { UserSubscriptionApiService } from './services/user-subscription-api.service';
import { OutboxPersistenceModule } from '@app/outbox';

@Module({
  imports: [SubscriptionLibPersistenceModule, OutboxPersistenceModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionPlanService,
    SubscriptionOfferService,
    UserSubscriptionApiService,
    OfferEntityFactory,
  ],
  exports: [
    SubscriptionPlanService,
    SubscriptionOfferService,
    UserSubscriptionApiService,
  ],
})
export class SubscriptionModule {}
