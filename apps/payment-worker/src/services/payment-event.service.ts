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
    externalSessionId: string,
    data: { externalInvoiceId?: string | null; metadata?: PaymentMetadata },
  ): Promise<void> {
    const payment =
      await this.paymentRepository.findByExternalSessionId(externalSessionId);

    if (!payment) return;

    await this.paymentRepository.update(payment.id, {
      externalInvoiceId: data.externalInvoiceId,
      status: PaymentStatus.PROCESSING,
      metadata: data.metadata,
    });
  }

  async markCheckoutExpired(
    externalSessionId: string,
    data: { externalInvoiceId?: string | null; metadata?: PaymentMetadata },
  ): Promise<void> {
    const payment =
      await this.paymentRepository.findByExternalSessionId(externalSessionId);

    if (!payment) return;

    await this.paymentRepository.update(payment.id, {
      externalInvoiceId: data.externalInvoiceId,
      status: PaymentStatus.EXPIRED,
      metadata: data.metadata,
    });
  }

  async markPaymentFailed(externalInvoiceId: string): Promise<void> {
    const payment =
      await this.paymentRepository.findByExternalInvoiceId(externalInvoiceId);

    if (!payment) return;

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.FAILED,
    });
  }

  async createFailedPayment(data: Partial<PaymentEntity>): Promise<void> {
    await this.paymentRepository.create({
      ...data,
      status: PaymentStatus.FAILED,
    });
  }
}
