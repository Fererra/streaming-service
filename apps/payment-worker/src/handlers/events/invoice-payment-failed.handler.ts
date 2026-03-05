import { Injectable } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  InvoicePaymentFailedPayload,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { PaymentEventService } from '../../services/payment-event.service';

@Injectable()
export class InvoicePaymentFailedHandler implements IPaymentEventHandler<'event.invoice.payment_failed'> {
  readonly eventType = 'event.invoice.payment_failed' as const;
  private readonly noSessionReasons = [
    'subscription_cycle',
    'subscription_update',
    'subscription_threshold',
  ];

  constructor(private readonly paymentEventService: PaymentEventService) {}

  async handle(payload: InvoicePaymentFailedPayload): Promise<void> {
    if (
      payload.billingReason &&
      this.noSessionReasons.includes(payload.billingReason)
    ) {
      await this.paymentEventService.createFailedPayment({
        userId: payload.metadata?.userId,
        subscriptionOfferId: payload.metadata?.offerId,
        externalInvoiceId: payload.externalInvoiceId,
        billingReason: payload.billingReason,
        amount: payload.amount,
        currency: payload.currency,
        gateway: PaymentGatewayProvider.STRIPE,
        metadata: payload.metadata,
      });

      return;
    }

    const internalPaymentId = payload.metadata.internalPaymentId;

    if (!internalPaymentId) return;

    await this.paymentEventService.markPaymentFailed(internalPaymentId);
  }
}
