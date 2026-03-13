import { Module } from '@nestjs/common';
import { PaymentPersistenceModule } from './payment-persistence.module';
import { PaymentQueueModule } from './payment-queue.module';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_CLIENT, PAYMENT_GATEWAY } from '../constants/constants';
import { StripePaymentGateway } from '../gateways/stripe/stripe-payment.gateway';
import { StripeEventParser } from '../gateways/stripe/stripe-event-parser.service';

@Module({
  imports: [PaymentPersistenceModule, PaymentQueueModule],
  providers: [
    {
      provide: STRIPE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.getOrThrow<string>('STRIPE_SECRET_KEY');

        return new Stripe(secretKey, {
          maxNetworkRetries: 3,
        });
      },
      inject: [ConfigService],
    },
    { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
    StripeEventParser,
  ],
  exports: [PaymentPersistenceModule, PaymentQueueModule, PAYMENT_GATEWAY],
})
export class PaymentLibModule {}
