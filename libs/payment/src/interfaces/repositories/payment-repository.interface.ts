import { PaymentEntity } from '../../entities/payment.entity';

export interface IPaymentRepository {
  create(payment: Partial<PaymentEntity>): Promise<PaymentEntity>;
  update(id: string, data: Partial<PaymentEntity>): Promise<number>;
}
