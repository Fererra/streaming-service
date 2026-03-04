import { Injectable } from '@nestjs/common';
import { InvoicePaidPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';

import { UserSubscriptionService } from 'libs/subscription/src';

@Injectable()
export class InvoicePaidHandler implements IPaymentEventHandler<'event.invoice.paid'> {
  readonly eventType = 'event.invoice.paid' as const;

  constructor(
    private readonly userSubscriptionService: UserSubscriptionService,
  ) {}

  async handle(payload: InvoicePaidPayload): Promise<void> {
    await this.userSubscriptionService.processInvoicePaid(payload);
  }
}
