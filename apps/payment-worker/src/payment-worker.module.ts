import { Module } from '@nestjs/common';
import { CheckoutCompletedHandler } from './handlers/checkout-completed.handler';
import { CheckoutExpiredHandler } from './handlers/checkout-expired.handler';
import { InvoicePaidHandler } from './handlers/invoice-paid.handler';
import { InvoicePaymentFailedHandler } from './handlers/invoice-payment-failed.handler';
import { PAYMENT_EVENT_HANDLERS } from './constants/constant';
import { IPaymentEventHandler } from './interfaces/payment-event-handler.interface';
import { BullModule } from '@nestjs/bullmq';
import { databaseConfig, queueConfig } from '@app/config';
import { EventType, PaymentModule } from '@app/payment';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentProcessor } from './payment.processor';
import { PaymentEventService } from './services/payment-event.service';
import { UserSubscriptionModule } from '@app/user-subscription';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        ...databaseConfig(),
      }),
    }),
    BullModule.forRootAsync({
      useFactory: async () => ({
        connection: {
          ...queueConfig(),
        },
      }),
    }),
    PaymentModule,
    UserSubscriptionModule,
  ],
  providers: [
    PaymentProcessor,
    PaymentEventService,
    CheckoutCompletedHandler,
    CheckoutExpiredHandler,
    InvoicePaidHandler,
    InvoicePaymentFailedHandler,
    {
      provide: PAYMENT_EVENT_HANDLERS,
      useFactory: (...handlers: IPaymentEventHandler<EventType>[]) => handlers,
      inject: [
        CheckoutCompletedHandler,
        CheckoutExpiredHandler,
        InvoicePaidHandler,
        InvoicePaymentFailedHandler,
      ],
    },
  ],
})
export class PaymentWorkerModule {}
