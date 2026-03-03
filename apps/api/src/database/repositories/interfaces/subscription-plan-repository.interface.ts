import { PlanStatus } from 'apps/api/src/modules/subscription/enums/status.enum';
import { SubscriptionPlanEntity } from '../../entities/subscription-plan.entity';

export interface ISubscriptionPlanRepository {
  findAllWithOffers(): Promise<SubscriptionPlanEntity[]>;
  findActiveWithOffers(): Promise<SubscriptionPlanEntity[]>;
  existsBy(
    criteria: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<boolean>;
  findById(
    id: string,
    options?: { withDeleted?: boolean },
  ): Promise<SubscriptionPlanEntity | null>;
  save(
    subscriptionPlan: Partial<SubscriptionPlanEntity>,
  ): Promise<SubscriptionPlanEntity>;
  update(
    id: string,
    updateData: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<number>;
  updateStatus(id: string, status: PlanStatus): Promise<number>;
}
