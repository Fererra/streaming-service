import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentGateway,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  WebhookEventResult,
  CreatePriceRequest,
  CreateCustomerRequest,
} from '../interfaces/payment-gateway.interface';
import { STRIPE_CLIENT } from '../payment.tokens';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';

@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  readonly gateway: PaymentGatewayProvider = PaymentGatewayProvider.STRIPE;
  private readonly webhookSecret: string;

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  async createPrice(request: CreatePriceRequest): Promise<{ id: string }> {
    const product = await this.stripe.products.create({
      name: request.planName,
      metadata: {
        offerId: request.id,
      },
    });

    const price = await this.stripe.prices.create({
      product: product.id,
      currency: request?.currency ?? 'USD',
      unit_amount: Math.round(request.amount * 100),
      recurring: {
        interval: 'month',
        interval_count: request.durationMonths,
      },
      metadata: {
        offerId: request.id,
      },
    });

    return {
      id: price.id,
    };
  }

  createCustomer(request: CreateCustomerRequest): Promise<{ id: string }> {
    return this.stripe.customers.create({
      email: request.email,
      metadata: { userId: request.userId },
    });
  }

  async createCheckoutSession(
    request: CheckoutSessionRequest,
  ): Promise<CheckoutSessionResponse> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: request.externalCustomerId,
      line_items: [
        {
          price: request.externalPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId: request.userId,
          offerId: request.offerId,
        },
      },
      metadata: {
        userId: request.userId,
        offerId: request.offerId,
      },
      success_url: this.configService.getOrThrow<string>('PAYMENT_SUCCESS_URL'),
      cancel_url: this.configService.getOrThrow<string>('PAYMENT_CANCEL_URL'),
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url!,
    };
  }

  private readonly eventHandlers = new Map<
    string,
    (data: Stripe.Event.Data.Object) => WebhookEventResult
  >([
    [
      'checkout.session.completed',
      (obj) => {
        const session = obj as Stripe.Checkout.Session;
        return {
          type: 'checkout.completed',
          externalSessionId: session.id,
          externalSubscriptionId: session.subscription as string,
          externalPaymentId: session.payment_intent as string,
          metadata: (session.metadata as Record<string, string>) ?? {},
        };
      },
    ],
    [
      'checkout.session.expired',
      (obj) => {
        const session = obj as Stripe.Checkout.Session;
        return {
          type: 'checkout.expired',
          externalSessionId: session.id,
          externalSubscriptionId: session.subscription as string,
          externalPaymentId: session.payment_intent as string,
          metadata: (session.metadata as Record<string, string>) ?? {},
        };
      },
    ],
    [
      'invoice.paid',
      (obj) => {
        const invoice = obj as Stripe.Invoice;
        return {
          type: 'invoice.paid',
          billingReason: invoice.billing_reason,
          externalSessionId: null,
          externalSubscriptionId: invoice.parent?.subscription_details
            ?.subscription as string,
          externalPaymentId: invoice.id as string,
          metadata: (invoice.metadata as Record<string, string>) ?? {},
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
        };
      },
    ],
    [
      'invoice.payment_failed',
      (obj) => {
        const invoice = obj as Stripe.Invoice;
        return {
          type: 'invoice.payment_failed',
          billingReason: invoice.billing_reason,
          externalSessionId: null,
          externalSubscriptionId: invoice.parent?.subscription_details
            ?.subscription as string,
          externalPaymentId: invoice.id as string,
          metadata: (invoice.metadata as Record<string, string>) ?? {},
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
        };
      },
    ],
  ]);

  async constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Promise<WebhookEventResult> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    const handler = this.eventHandlers.get(event.type);

    if (!handler) {
      throw new BadRequestException(
        `Unhandled webhook event type: ${event.type}`,
      );
    }

    return handler(event.data.object);
  }
}
