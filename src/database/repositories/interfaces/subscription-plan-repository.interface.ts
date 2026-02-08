import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';
import { SubscriptionPlanEntity } from 'src/database/entities/subscription-plan.entity';

export interface ISubscriptionPlanRepository {
  existsBy(criteria: Partial<SubscriptionPlanEntity>): Promise<boolean>;
  save(
    subscriptionPlan: Partial<SubscriptionPlanEntity>,
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionPlanEntity>;
}
