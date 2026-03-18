import { UserSubscriptionEntity } from '../entities/user-subscription.entity';

export interface IUserSubscriptionRepository {
  findByUserId(userId: string): Promise<[UserSubscriptionEntity[], number]>;
  updateByExternalSubscriptionId(
    externalSubscriptionId: string,
    data: Partial<UserSubscriptionEntity>,
  ): Promise<number>;
  hasActiveSubscription(userId: string): Promise<boolean>;
}
