import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { PlanStatus } from '../enums/status.enum';

export interface ISubscriptionPlanRepository {
  findAllWithOffers(): Promise<SubscriptionPlanEntity[]>;
  findActiveWithOffers(): Promise<SubscriptionPlanEntity[]>;
  existsBy(
    criteria: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<boolean>;
  findById(id: string): Promise<SubscriptionPlanEntity | null>;
  save(
    subscriptionPlan: Partial<SubscriptionPlanEntity>,
  ): Promise<SubscriptionPlanEntity>;
  update(
    id: string,
    updateData: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<number>;
  updateStatus(id: string, status: PlanStatus): Promise<number>;
}
