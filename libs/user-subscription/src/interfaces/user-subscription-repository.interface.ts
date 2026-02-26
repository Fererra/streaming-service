import { UserSubscriptionEntity } from '../entities/user-subscription.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

export interface IUserSubscriptionRepository {
  create(
    data: Partial<UserSubscriptionEntity>,
  ): Promise<UserSubscriptionEntity>;
  updateStatus(
    subscriptionId: number,
    status: SubscriptionStatus,
  ): Promise<number>;
}
