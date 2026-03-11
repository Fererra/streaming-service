import { Inject, Injectable } from '@nestjs/common';
import {
  CheckoutCompletedPayload,
  type IPaymentRepository,
  PAYMENT_REPOSITORY,
  PaymentStatus,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';

@Injectable()
export class CheckoutCompletedHandler implements IPaymentEventHandler<'event.checkout.completed'> {
  readonly eventType = 'event.checkout.completed' as const;

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async handle(payload: CheckoutCompletedPayload): Promise<void> {
    const initialPaymentId = payload.metadata?.initialPaymentId;

    if (!initialPaymentId) return;

    const affected = await this.paymentRepository.update(initialPaymentId, {
      externalInvoiceId: payload.externalInvoiceId,
      status: PaymentStatus.PROCESSING,
      metadata: payload.metadata,
    });

    if (affected === 0) {
      console.warn(
        `Payment Intent ${initialPaymentId} not found for Checkout Completed webhook.`,
      );
    }
  }
}
