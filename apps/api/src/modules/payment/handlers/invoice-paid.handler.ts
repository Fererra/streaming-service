import { Inject, Injectable } from '@nestjs/common';
import type { WebhookEventResult } from '../interfaces/payment-gateway.interface';
import type { WebhookEventHandler } from '../interfaces/webhook-event-handler.interface';
import type { IPaymentRepository } from 'src/database/repositories/interfaces/payment-repository.interface';
import { PAYMENT_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';

@Injectable()
export class InvoicePaidHandler implements WebhookEventHandler {
  readonly eventType = 'invoice.paid' as const;

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async handle(event: WebhookEventResult): Promise<void> {
    if (event.billingReason === 'subscription_create') {
      const payment = await this.paymentRepository.findByExternalSessionId(
        event.externalSessionId as string,
      );

      if (!payment) return;

      await this.paymentRepository.updateStatus(
        payment.id,
        PaymentStatus.COMPLETED,
        event.externalPaymentId ?? undefined,
      );

      return;
    }

    await this.paymentRepository.create({
      externalPaymentId: event.externalPaymentId,
      billingReason: event.billingReason,
      status: PaymentStatus.COMPLETED,
      amount: event.amount!,
      currency: event.currency!,
      gateway: PaymentGatewayProvider.STRIPE,
      user: { id: event.metadata.userId } as any,
    });
  }
}
