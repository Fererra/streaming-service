import { Inject, Injectable } from '@nestjs/common';
import {
  CheckoutExpiredPayload,
  type IPaymentRepository,
  PAYMENT_REPOSITORY,
  PaymentStatus,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';

@Injectable()
export class CheckoutExpiredHandler implements IPaymentEventHandler<'event.checkout.expired'> {
  readonly eventType = 'event.checkout.expired' as const;

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async handle(payload: CheckoutExpiredPayload): Promise<void> {
    const initialPaymentId = payload.metadata?.initialPaymentId;

    if (!initialPaymentId) return;

    const affected = await this.paymentRepository.update(initialPaymentId, {
      externalInvoiceId: payload.externalInvoiceId,
      status: PaymentStatus.EXPIRED,
      metadata: payload.metadata,
    });

    if (affected === 0) {
      console.warn(
        `Payment Intent ${initialPaymentId} not found for Checkout Expired webhook.`,
      );
    }
  }
}
