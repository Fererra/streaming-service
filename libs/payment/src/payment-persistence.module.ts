import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { PAYMENT_REPOSITORY } from './constants/constants';
import { PaymentRepository } from './repositories/payment.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity])],
  providers: [{ provide: PAYMENT_REPOSITORY, useClass: PaymentRepository }],
  exports: [TypeOrmModule, PAYMENT_REPOSITORY],
})
export class PaymentPersistenceModule {}
