import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionUpdatedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import {
  USER_SUBSCRIPTION_REPOSITORY,
  type IUserSubscriptionRepository,
  UserSubscriptionEntity,
} from '@app/subscription';

@Injectable()
export class SubscriptionUpdatedHandler implements IPaymentEventHandler<'event.subscription.updated'> {
  readonly eventType = 'event.subscription.updated' as const;

  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepository: IUserSubscriptionRepository,
  ) {}

  async handle(payload: SubscriptionUpdatedPayload): Promise<void> {
    const { externalSubscriptionId, updates } = payload;

    const updateData: Partial<UserSubscriptionEntity> = {
      ...(updates.status && { status: updates.status }),
      ...(updates.cancellation && {
        cancellationReason: updates.cancellation.reason,
        canceledAt: updates.cancellation.canceledAt,
      }),
    };

    if (Object.keys(updateData).length === 0) return;

    const affected =
      await this.userSubscriptionRepository.updateByExternalSubscriptionId(
        externalSubscriptionId,
        updateData,
      );

    if (affected === 0) {
      console.warn(
        `Subscription ${externalSubscriptionId} not found for update`,
      );
    }
  }
}
