import { UserSubscriptionEntity } from '../entities/user-subscription.entity';

export interface IUserSubscriptionRepository {
  updateByExternalSubscriptionId(
    externalSubscriptionId: string,
    data: Partial<UserSubscriptionEntity>,
  ): Promise<number>;
}
