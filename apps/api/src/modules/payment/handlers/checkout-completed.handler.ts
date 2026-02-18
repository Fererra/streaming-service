import { Inject, Injectable } from '@nestjs/common';
import type { WebhookEventResult } from '../interfaces/payment-gateway.interface';
import type { WebhookEventHandler } from '../interfaces/webhook-event-handler.interface';
import type { IPaymentRepository } from 'src/database/repositories/interfaces/payment-repository.interface';
import { PAYMENT_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { PaymentStatus } from '../enums/payment-status.enum';

@Injectable()
export class CheckoutCompletedHandler implements WebhookEventHandler {
  readonly eventType = 'checkout.completed' as const;

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async handle(event: WebhookEventResult): Promise<void> {
    const payment = await this.paymentRepository.findByExternalSessionId(
      event.externalSessionId as string,
    );

    if (!payment) return;

    await this.paymentRepository.updateStatus(
      payment.id,
      PaymentStatus.PROCESSING,
      event.externalPaymentId ?? undefined,
    );
  }
}
