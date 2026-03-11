import { Inject, Injectable } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  InvoicePaymentFailedPayload,
  PAYMENT_REPOSITORY,
  type IPaymentRepository,
  PaymentStatus,
  PaymentEntity,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';

@Injectable()
export class InvoicePaymentFailedHandler implements IPaymentEventHandler<'event.invoice.payment_failed'> {
  readonly eventType = 'event.invoice.payment_failed' as const;
  private readonly noSessionReasons = [
    'subscription_cycle',
    'subscription_update',
    'subscription_threshold',
  ];

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async handle(payload: InvoicePaymentFailedPayload): Promise<void> {
    if (
      payload.billingReason &&
      this.noSessionReasons.includes(payload.billingReason)
    ) {
      await this.createFailedPayment({
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

    const initialPaymentId = payload.metadata.initialPaymentId;

    if (!initialPaymentId) return;

    await this.markPaymentFailed(initialPaymentId);
  }

  private async createFailedPayment(
    data: Partial<PaymentEntity>,
  ): Promise<void> {
    await this.paymentRepository.create({
      ...data,
      status: PaymentStatus.FAILED,
    });
  }

  private async markPaymentFailed(initialPaymentId: string): Promise<void> {
    const affected = await this.paymentRepository.update(initialPaymentId, {
      status: PaymentStatus.FAILED,
    });

    if (affected === 0) {
      console.warn(
        `Payment Intent ${initialPaymentId} not found for Payment Failed webhook.`,
      );
    }
  }
}
