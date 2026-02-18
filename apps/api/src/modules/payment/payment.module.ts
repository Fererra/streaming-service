import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { WebhookController } from './webhook.controller';
import { StripePaymentGateway } from './gateways/stripe-payment.gateway';
import { CheckoutCompletedHandler } from './handlers/checkout-completed.handler';
import { InvoicePaidHandler } from './handlers/invoice-paid.handler';
import {
  PAYMENT_GATEWAY,
  STRIPE_CLIENT,
  WEBHOOK_EVENT_HANDLERS,
} from './payment.tokens';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentController, WebhookController],
  providers: [
    PaymentService,
    CheckoutCompletedHandler,
    InvoicePaidHandler,
    {
      provide: STRIPE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.getOrThrow<string>('STRIPE_SECRET_KEY');

        return new Stripe(secretKey);
      },
      inject: [ConfigService],
    },
    {
      provide: WEBHOOK_EVENT_HANDLERS,
      useFactory: (
        checkout: CheckoutCompletedHandler,
        invoice: InvoicePaidHandler,
      ) => [checkout, invoice],
      inject: [CheckoutCompletedHandler, InvoicePaidHandler],
    },
    { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
