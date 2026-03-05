import { Inject, Injectable } from '@nestjs/common';
import {
  type IPaymentRepository,
  PAYMENT_REPOSITORY,
  PaymentStatus,
  PaymentMetadata,
  PaymentEntity,
} from '@app/payment';

@Injectable()
export class PaymentEventService {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async markCheckoutCompleted(
    internalPaymentId: string,
    data: { externalInvoiceId?: string | null; metadata?: PaymentMetadata },
  ): Promise<void> {
    const affected = await this.paymentRepository.update(internalPaymentId, {
      externalInvoiceId: data.externalInvoiceId,
      status: PaymentStatus.PROCESSING,
      metadata: data.metadata,
    });

    if (affected === 0) {
      console.warn(
        `Payment Intent ${internalPaymentId} not found for Checkout Completed webhook.`,
      );
    }
  }

  async markCheckoutExpired(
    internalPaymentId: string,
    data: { externalInvoiceId?: string | null; metadata?: PaymentMetadata },
  ): Promise<void> {
    const affected = await this.paymentRepository.update(internalPaymentId, {
      externalInvoiceId: data.externalInvoiceId,
      status: PaymentStatus.EXPIRED,
      metadata: data.metadata,
    });

    if (affected === 0) {
      console.warn(
        `Payment Intent ${internalPaymentId} not found for Checkout Expired webhook.`,
      );
    }
  }

  async markPaymentFailed(internalPaymentId: string): Promise<void> {
    const affected = await this.paymentRepository.update(internalPaymentId, {
      status: PaymentStatus.FAILED,
    });

    if (affected === 0) {
      console.warn(
        `Payment Intent ${internalPaymentId} not found for Payment Failed webhook.`,
      );
    }
  }

  async createFailedPayment(data: Partial<PaymentEntity>): Promise<void> {
    await this.paymentRepository.create({
      ...data,
      status: PaymentStatus.FAILED,
    });
  }
}
