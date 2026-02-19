import { PaymentEntity } from '../../entities/payment.entity';
import { PaymentStatus } from '../../../modules/payment/enums/payment-status.enum';

export interface IPaymentRepository {
  create(payment: Partial<PaymentEntity>): Promise<PaymentEntity>;
  findByExternalSessionId(sessionId: string): Promise<PaymentEntity | null>;
  updateStatus(
    id: string,
    status: PaymentStatus,
    externalPaymentId?: string,
  ): Promise<void>;
}
