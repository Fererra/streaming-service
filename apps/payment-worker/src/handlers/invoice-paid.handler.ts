import { Injectable } from '@nestjs/common';
import { InvoicePaidPayload } from '@app/payment';
import { IPaymentEventHandler } from '../interfaces/payment-event-handler.interface';

import { UserSubscriptionService } from '@app/user-subscription';

@Injectable()
export class InvoicePaidHandler implements IPaymentEventHandler<'invoice.paid'> {
  readonly eventType = 'invoice.paid' as const;

  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  async handle(payload: InvoicePaidPayload): Promise<void> {
    await this.userSubscriptionService.processInvoicePaid(payload);
  }
}
