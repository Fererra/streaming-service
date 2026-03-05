import { Injectable } from '@nestjs/common';
import { CheckoutCompletedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { PaymentEventService } from '../../services/payment-event.service';

@Injectable()
export class CheckoutCompletedHandler implements IPaymentEventHandler<'event.checkout.completed'> {
  readonly eventType = 'event.checkout.completed' as const;

  constructor(private readonly paymentEventService: PaymentEventService) {}

  async handle(payload: CheckoutCompletedPayload): Promise<void> {
    const internalPaymentId = payload.metadata?.internalPaymentId;

    if (!internalPaymentId) return;

    await this.paymentEventService.markCheckoutCompleted(internalPaymentId, {
      externalInvoiceId: payload.externalInvoiceId,
      metadata: payload.metadata,
    });
  }
}
