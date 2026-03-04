import { PaymentEntity } from '../../entities/payment.entity';

export interface IPaymentRepository {
  create(payment: Partial<PaymentEntity>): Promise<PaymentEntity>;
  findByExternalSessionId(sessionId: string): Promise<PaymentEntity | null>;
  findByExternalInvoiceId(invoiceId: string): Promise<PaymentEntity | null>;
  update(id: string, data: Partial<PaymentEntity>): Promise<void>;
}
