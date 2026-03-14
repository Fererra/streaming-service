import { Injectable } from '@nestjs/common';
import {
  PaymentGatewayProvider,
  InvoicePaymentFailedPayload,
  PaymentStatus,
  PaymentEntity,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { DataSource } from 'typeorm';

@Injectable()
export class InvoicePaymentFailedHandler implements IPaymentEventHandler<'event.invoice.payment_failed'> {
  readonly eventType = 'event.invoice.payment_failed' as const;
  private readonly noSessionReasons = [
    'subscription_cycle',
    'subscription_update',
    'subscription_threshold',
  ];

  constructor(private readonly dataSource: DataSource) {}

  async handle(payload: InvoicePaymentFailedPayload): Promise<void> {
    if (
      payload.billingReason &&
      this.noSessionReasons.includes(payload.billingReason)
    ) {
      await this.createFailedPayment({
        ...payload,
        gateway: PaymentGatewayProvider.STRIPE,
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
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(PaymentEntity)
      .values({
        userId: data.metadata?.userId,
        subscriptionOfferId: data.metadata?.offerId,
        externalInvoiceId: data.externalInvoiceId,
        billingReason: data.billingReason,
        amount: data.amount,
        currency: data.currency,
        gateway: data.gateway,
        metadata: data.metadata,
        status: PaymentStatus.FAILED,
      })
      .orIgnore()
      .execute();
  }

  private async markPaymentFailed(initialPaymentId: string): Promise<void> {
    const result = await this.dataSource
      .getRepository(PaymentEntity)
      .update(initialPaymentId, { status: PaymentStatus.FAILED });

    if (result.affected === 0) {
      console.warn(
        `Payment Intent ${initialPaymentId} not found for Payment Failed webhook.`,
      );
    }
  }
}
