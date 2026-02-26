import { Injectable } from '@nestjs/common';
import { CheckoutCompletedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../interfaces/payment-event-handler.interface';
import { PaymentEventService } from '../services/payment-event.service';

@Injectable()
export class CheckoutCompletedHandler implements IPaymentEventHandler<'checkout.completed'> {
  readonly eventType = 'checkout.completed' as const;

  constructor(private readonly paymentEventService: PaymentEventService) {}

  async handle(payload: CheckoutCompletedPayload): Promise<void> {
    await this.paymentEventService.markCheckoutCompleted(
      payload.externalSessionId as string,
      {
        externalInvoiceId: payload.externalInvoiceId,
        metadata: payload.metadata,
      },
    );
  }
}
