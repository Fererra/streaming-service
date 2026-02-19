import { Inject, Injectable } from '@nestjs/common';
import type { WebhookEventResult } from '../interfaces/payment-gateway.interface';
import type { WebhookEventHandler } from '../interfaces/webhook-event-handler.interface';
import type { IPaymentRepository } from '../../../database/repositories/interfaces/payment-repository.interface';
import { PAYMENT_REPOSITORY } from '../../../database/repositories/tokens/repository.tokens';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';

@Injectable()
export class InvoiceFailedHandler implements WebhookEventHandler {
  readonly eventType = 'invoice.payment_failed' as const;
  private readonly noSessionReasons = [
    'subscription_cycle',
    'subscription_update',
    'subscription_threshold',
  ];

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async handle(event: WebhookEventResult): Promise<void> {
    if (
      event.billingReason &&
      this.noSessionReasons.includes(event.billingReason)
    ) {
      await this.paymentRepository.create({
        externalPaymentId: event.externalPaymentId,
        billingReason: event.billingReason,
        status: PaymentStatus.FAILED,
        amount: event.amount!,
        currency: event.currency!,
        gateway: PaymentGatewayProvider.STRIPE,
        user: { id: event.metadata.userId } as any,
      });
      return;
    }

    const payment = await this.paymentRepository.findByExternalSessionId(
      event.externalSessionId as string,
    );

    if (!payment) return;

    await this.paymentRepository.updateStatus(
      payment.id,
      PaymentStatus.FAILED,
      event.externalPaymentId ?? undefined,
    );
  }
}
