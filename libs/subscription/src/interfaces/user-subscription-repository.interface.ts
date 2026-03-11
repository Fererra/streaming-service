import { UserSubscriptionEntity } from '../entities/user-subscription.entity';

export interface IUserSubscriptionRepository {
  findByUserId(userId: string): Promise<[UserSubscriptionEntity[], number]>;
  findByIdAndUserId(
    subscriptionId: string,
    userId: string,
  ): Promise<UserSubscriptionEntity | null>;
  updateByExternalSubscriptionId(
    externalSubscriptionId: string,
    data: Partial<UserSubscriptionEntity>,
  ): Promise<number>;
}
