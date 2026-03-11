import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionDeletedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import {
  type IUserSubscriptionRepository,
  USER_SUBSCRIPTION_REPOSITORY,
} from '@app/subscription';

@Injectable()
export class SubscriptionDeletedHandler implements IPaymentEventHandler<'event.subscription.deleted'> {
  readonly eventType = 'event.subscription.deleted' as const;

  constructor(
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepository: IUserSubscriptionRepository,
  ) {}

  async handle(payload: SubscriptionDeletedPayload): Promise<void> {
    const affected =
      await this.userSubscriptionRepository.updateByExternalSubscriptionId(
        payload.externalSubscriptionId,
        {
          status: payload.status,
          cancellationReason: payload.cancellationReason,
          canceledAt: payload.canceledAt,
        },
      );

    if (affected === 0) {
      console.warn(
        `Subscription ${payload.externalSubscriptionId} not found for deletion`,
      );
    }
  }
}
