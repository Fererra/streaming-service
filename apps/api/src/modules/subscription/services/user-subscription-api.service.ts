import {
  type IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
} from '@app/subscription';
import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaginationOptions } from '../../../common/@types/pagination.types';
import { buildPaginationResponse } from '../../../common/utils/pagination.util';
import { type IPaymentQueueService, PAYMENT_QUEUE_SERVICE } from '@app/payment';
import { CancellationInitiator, UserSubscriptionStatus } from '@app/shared';

@Injectable()
export class UserSubscriptionApiService {
  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepository: IUserSubscriptionRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentCommandQueue: IPaymentQueueService,
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
    const subscription =
      await this.userSubscriptionRepository.findByIdAndUserId(
        subscriptionId,
        userId,
      );

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const cancellableStatuses: UserSubscriptionStatus[] = [
      UserSubscriptionStatus.ACTIVE,
      UserSubscriptionStatus.PAST_DUE,
    ];

    if (!cancellableStatuses.includes(subscription.status)) {
      throw new BadRequestException(
        `Subscription cannot be canceled in its current status: ${subscription.status}`,
      );
    }

    await this.paymentCommandQueue.dispatchCommand(
      'command.deactivateSubscription',
      {
        subscriptionId: subscription.externalSubscriptionId,
        initiator,
      },
    );
  }

  hasActiveSubscription(userId: string): Promise<boolean> {
    return this.userSubscriptionRepository.hasActiveSubscription(userId);
  }
}
