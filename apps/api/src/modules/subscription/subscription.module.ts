import { Module } from '@nestjs/common';
import { SubscriptionPlanService } from './services/subscription-plan.service';
import { SubscriptionOfferService } from './services/subscription-offer.service';
import { OfferEntityFactory } from './factories/offer-entity.factory';
import { SubscriptionController } from './subscription.controller';
import { PaymentQueueModule } from '@app/payment';
import { SubscriptionLibPersistenceModule } from '@app/subscription';

@Module({
  imports: [SubscriptionLibPersistenceModule, PaymentQueueModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionPlanService,
    SubscriptionOfferService,
    OfferEntityFactory,
  ],
  exports: [SubscriptionPlanService, SubscriptionOfferService],
})
export class SubscriptionModule {}
