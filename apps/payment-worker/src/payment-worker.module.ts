import { Module } from '@nestjs/common';
import { CheckoutCompletedHandler } from './handlers/events/checkout-completed.handler';
import { CheckoutExpiredHandler } from './handlers/events/checkout-expired.handler';
import { InvoicePaidHandler } from './handlers/events/invoice-paid.handler';
import { InvoicePaymentFailedHandler } from './handlers/events/invoice-payment-failed.handler';
import { PAYMENT_EVENT_HANDLERS } from './constants/constant';
import { IPaymentEventHandler } from './interfaces/payment-event-handler.interface';
import { BullModule } from '@nestjs/bullmq';
import { databaseConfig, queueConfig } from '@app/config';
import { EventType, PaymentLibModule } from '@app/payment';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEventService } from './services/payment-event.service';
import { SubscriptionLibModule } from 'libs/subscription/src';
import { PaymentEventProcessor } from './processors/event.processor';
import { PaymentCommandProcessor } from './processors/command.processor';
import { PaymentCommandService } from './services/payment-command.service';
import { ConfigModule } from '@nestjs/config';
import { PaymentCommandHandlersRegistry } from './handlers/commands/command-handle.registry';
import { ProductCreatedHandler } from './handlers/events/product-created.handler';
import { PriceCreatedHandler } from './handlers/events/price-created.handler';
import { ProductUpdatedHandler } from './handlers/events/product-updated.handler';
import { PriceUpdatedHandler } from './handlers/events/price-updated.handler';
import { SubscriptionUpdatedHandler } from './handlers/events/subscription-updated.handler';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}.local`,
      isGlobal: true,
    }),
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
    PaymentLibModule,
    SubscriptionLibModule,
  ],
  providers: [
    PaymentCommandService,
    PaymentCommandHandlersRegistry,
    PaymentEventProcessor,
    PaymentCommandProcessor,
    ProductCreatedHandler,
    ProductUpdatedHandler,
    PriceCreatedHandler,
    PriceUpdatedHandler,
    PaymentEventService,
    CheckoutCompletedHandler,
    CheckoutExpiredHandler,
    InvoicePaidHandler,
    InvoicePaymentFailedHandler,
    SubscriptionUpdatedHandler,
    {
      provide: PAYMENT_EVENT_HANDLERS,
      useFactory: (...handlers: IPaymentEventHandler<EventType>[]) => handlers,
      inject: [
        ProductCreatedHandler,
        ProductUpdatedHandler,
        PriceCreatedHandler,
        PriceUpdatedHandler,
        CheckoutCompletedHandler,
        CheckoutExpiredHandler,
        InvoicePaidHandler,
        InvoicePaymentFailedHandler,
        SubscriptionUpdatedHandler,
      ],
    },
  ],
})
export class PaymentWorkerModule {}
