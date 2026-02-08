import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';
import { SubscriptionPlanEntity } from 'src/database/entities/subscription-plan.entity';

export interface ISubscriptionPlanRepository {
  existsBy(
    criteria: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<boolean>;
  findById(
    id: string,
    options?: { withDeleted?: boolean },
  ): Promise<SubscriptionPlanEntity | null>;
  save(
    subscriptionPlan: Partial<SubscriptionPlanEntity>,
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionPlanEntity>;
  update(
    id: string,
    updateData: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<number>;
  activatePlan(plan: Partial<SubscriptionPlanEntity>): Promise<void>;
  deactivatePlan(plan: Partial<SubscriptionPlanEntity>): Promise<void>;
}
