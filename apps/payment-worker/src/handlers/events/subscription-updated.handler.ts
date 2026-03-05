import { Injectable } from '@nestjs/common';
import { SubscriptionUpdatedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { UserSubscriptionService } from '@app/subscription';

@Injectable()
export class SubscriptionUpdatedHandler implements IPaymentEventHandler<'event.subscription.updated'> {
  readonly eventType = 'event.subscription.updated' as const;

  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  async handle(payload: SubscriptionUpdatedPayload): Promise<void> {
    if (payload.cancellationReason && payload.canceledAt) {
      await this.userSubscriptionService.markSubscriptionAsCanceled(payload);
    }
  }
}
