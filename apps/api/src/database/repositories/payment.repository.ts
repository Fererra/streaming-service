import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { IPaymentRepository } from './interfaces/payment-repository.interface';
import { PaymentStatus } from '../../modules/payment/enums/payment-status.enum';

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

  async findByExternalSessionId(
    sessionId: string,
  ): Promise<PaymentEntity | null> {
    return this.repository.findOne({
      select: ['id', 'status'],
      where: { externalSessionId: sessionId },
    });
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    externalPaymentId?: string,
  ): Promise<void> {
    await this.repository.update(id, {
      status,
      externalPaymentId,
    });
  }
}
