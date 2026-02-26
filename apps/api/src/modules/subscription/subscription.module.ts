import { Module } from '@nestjs/common';
import { SubscriptionPlanService } from './services/subscription-plan.service';
import { SubscriptionOfferService } from './services/subscription-offer.service';
import { OfferEntityFactory } from './factories/offer-entity.factory';
import { DatabaseModule } from '../../database/database.module';
import { SubscriptionController } from './subscription.controller';
import { PaymentApiModule } from '../payment/payment-api.module';

@Module({
  imports: [DatabaseModule, PaymentApiModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionPlanService,
    SubscriptionOfferService,
    OfferEntityFactory,
  ],
  exports: [SubscriptionPlanService, SubscriptionOfferService],
})
export class SubscriptionModule {}
