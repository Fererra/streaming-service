import { Injectable } from '@nestjs/common';
import { SubscriptionDeletedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { UserSubscriptionService } from '@app/subscription';

@Injectable()
export class SubscriptionDeletedHandler implements IPaymentEventHandler<'event.subscription.deleted'> {
  readonly eventType = 'event.subscription.deleted' as const;

  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  async handle(payload: SubscriptionDeletedPayload): Promise<void> {
    await this.userSubscriptionService.markSubscriptionAsDeleted(payload);
  }
}
