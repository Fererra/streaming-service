import { Injectable } from '@nestjs/common';
import { CheckoutCompletedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { PaymentEventService } from '../../services/payment-event.service';

@Injectable()
export class CheckoutCompletedHandler implements IPaymentEventHandler<'event.checkout.completed'> {
  readonly eventType = 'event.checkout.completed' as const;

  constructor(private readonly paymentEventService: PaymentEventService) {}

  async handle(payload: CheckoutCompletedPayload): Promise<void> {
    const initialPaymentId = payload.metadata?.initialPaymentId;

    if (!initialPaymentId) return;

    await this.paymentEventService.markCheckoutCompleted(initialPaymentId, {
      externalInvoiceId: payload.externalInvoiceId,
      metadata: payload.metadata,
    });
  }
}
