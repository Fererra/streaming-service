import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSubscriptionEntity } from '../entities/user-subscription.entity';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { SubscriptionOfferEntity } from '../entities/subscription-offer.entity';
import {
  SUBSCRIPTION_OFFER_REPOSITORY,
  SUBSCRIPTION_PLAN_REPOSITORY,
} from '../constants/constant';
import { SubscriptionPlanRepository } from '../repositories/subscription-plan.repository';
import { SubscriptionOfferRepository } from '../repositories/subscription-offer.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserSubscriptionEntity,
      SubscriptionPlanEntity,
      SubscriptionOfferEntity,
    ]),
  ],
  providers: [
    {
      provide: SUBSCRIPTION_PLAN_REPOSITORY,
      useClass: SubscriptionPlanRepository,
    },
    {
      provide: SUBSCRIPTION_OFFER_REPOSITORY,
      useClass: SubscriptionOfferRepository,
    },
  ],
  exports: [SUBSCRIPTION_PLAN_REPOSITORY, SUBSCRIPTION_OFFER_REPOSITORY],
})
export class SubscriptionLibPersistenceModule {}
