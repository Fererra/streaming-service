import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { WebhookController } from './webhook.controller';
import { StripePaymentGateway } from './gateways/stripe-payment.gateway';
import { PAYMENT_GATEWAY, STRIPE_CLIENT } from './payment.tokens';
import { DatabaseModule } from '../../database/database.module';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentModule } from '@app/payment';

@Module({
  imports: [DatabaseModule, PaymentModule],
  controllers: [PaymentController, WebhookController],
  providers: [
    PaymentService,
    {
      provide: STRIPE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.getOrThrow<string>('STRIPE_SECRET_KEY');

        return new Stripe(secretKey);
      },
      inject: [ConfigService],
    },
    { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
  ],
  exports: [PaymentService],
})
export class PaymentApiModule {}
