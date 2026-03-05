import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { IPaymentRepository } from '../interfaces/repositories/payment-repository.interface';

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

  existsById(id: string): Promise<PaymentEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<PaymentEntity>): Promise<number> {
    const result = await this.repository.update(id, data);

    return result.affected ?? 0;
  }
}
