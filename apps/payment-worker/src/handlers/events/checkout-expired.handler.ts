import { Injectable } from '@nestjs/common';
import { CheckoutExpiredPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { PaymentEventService } from '../../services/payment-event.service';

@Injectable()
export class CheckoutExpiredHandler implements IPaymentEventHandler<'event.checkout.expired'> {
  readonly eventType = 'event.checkout.expired' as const;

  constructor(private readonly paymentEventService: PaymentEventService) {}

  async handle(payload: CheckoutExpiredPayload): Promise<void> {
    const initialPaymentId = payload.metadata?.initialPaymentId;

    if (!initialPaymentId) return;

    await this.paymentEventService.markCheckoutExpired(initialPaymentId, {
      externalInvoiceId: payload.externalInvoiceId,
      metadata: payload.metadata,
    });
  }
}
