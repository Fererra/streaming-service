import {
  type IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
  UserSubscriptionEntity,
} from '@app/subscription';
import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaginationOptions } from '../../../common/@types/pagination.types';
import { buildPaginationResponse } from '../../../common/utils/pagination.util';
import { CancellationInitiator, UserSubscriptionStatus } from '@app/shared';
import { DataSource } from 'typeorm';
import { OutboxEntity } from '@app/outbox';

@Injectable()
export class UserSubscriptionApiService {
  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepository: IUserSubscriptionRepository,
    private readonly dataSource: DataSource,
  ) {}

  async getUserSubscriptions(userId: string, pagination: PaginationOptions) {
    const [subscriptions, total] =
      await this.userSubscriptionRepository.findByUserId(userId);

    return buildPaginationResponse(subscriptions, total, pagination);
  }

  async cancelSubscription(
    userId: string,
    subscriptionId: string,
    initiator: CancellationInitiator = CancellationInitiator.USER,
  ) {
    const cancellableStatuses: UserSubscriptionStatus[] = [
      UserSubscriptionStatus.ACTIVE,
      UserSubscriptionStatus.PAST_DUE,
    ];

    await this.dataSource.transaction(async (manager) => {
      const subscription = await manager
        .createQueryBuilder(UserSubscriptionEntity, 'sub')
        .setLock('pessimistic_write')
        .setOnLocked('nowait')
        .where('sub.id = :subscriptionId', { subscriptionId })
        .andWhere('sub.userId = :userId', { userId })
        .getOne();

      if (!subscription) throw new NotFoundException('Subscription not found');

      if (!cancellableStatuses.includes(subscription.status)) {
        throw new BadRequestException(
          `Subscription cannot be canceled in its current status: ${subscription.status}`,
        );
      }

      await manager.update(
        UserSubscriptionEntity,
        { id: subscriptionId },
        {
          status: UserSubscriptionStatus.CANCELING,
        },
      );

      await manager.insert(OutboxEntity, {
        type: 'command.deactivateSubscription' as const,
        payload: {
          subscriptionId: subscription.externalSubscriptionId,
          initiator,
          idempotencyKey: `deactivate-subscription-${subscription.id}`,
        },
      });
    });
  }

  hasActiveSubscription(userId: string): Promise<boolean> {
    return this.userSubscriptionRepository.hasActiveSubscription(userId);
  }
}
