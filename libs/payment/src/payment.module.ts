import { Module } from '@nestjs/common';
import { PaymentPersistenceModule } from './payment-persistence.module';
import { PaymentQueueModule } from './payment-queue.module';

@Module({
  imports: [PaymentPersistenceModule, PaymentQueueModule],
  exports: [PaymentPersistenceModule, PaymentQueueModule],
})
export class PaymentModule {}
