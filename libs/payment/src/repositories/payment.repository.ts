import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { IPaymentRepository } from '../interfaces/payment-repository.interface';

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repository: Repository<PaymentEntity>,
  ) {}

  async create(payment: Partial<PaymentEntity>): Promise<PaymentEntity> {
    const entity = this.repository.create(payment);
    return this.repository.save(entity);
  }

  findByExternalSessionId(sessionId: string): Promise<PaymentEntity | null> {
    return this.repository.findOne({
      select: ['id', 'status'],
      where: { externalSessionId: sessionId },
    });
  }

  findByExternalInvoiceId(invoiceId: string): Promise<PaymentEntity | null> {
    return this.repository.findOne({
      select: ['id', 'status'],
      where: { externalInvoiceId: invoiceId },
    });
  }

  async update(id: string, data: Partial<PaymentEntity>): Promise<void> {
    await this.repository.update(id, data);
  }
}
