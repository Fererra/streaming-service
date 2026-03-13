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
  CreateProductRequest,
  UpdateProductRequest,
} from '../../interfaces/payment-gateway.interface';
import { STRIPE_CLIENT } from '../../constants/constants';
import { PaymentGatewayProvider } from '../../enums/payment-gateway-provider.enum';
import { CancellationInitiator } from '@app/shared';
import { StripeEventParser } from './stripe-event-parser.service';

@Injectable()
export class StripePaymentGateway implements PaymentGateway {
  readonly gateway: PaymentGatewayProvider = PaymentGatewayProvider.STRIPE;
  private readonly webhookSecret: string;

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly configService: ConfigService,
    private readonly stripeEventParser: StripeEventParser,
  ) {
    this.webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
  }

  async createProduct(
    request: CreateProductRequest,
    idempotencyKey: string,
  ): Promise<{ id: string }> {
    const product = await this.stripe.products.create(
      {
        name: request.name,
        description: request.description,
        metadata: {
          planId: request.id,
        },
      },
      { idempotencyKey },
    );

    return { id: product.id };
  }

  async updateProduct(
    externalProductId: string,
    request: UpdateProductRequest,
    idempotencyKey: string,
  ): Promise<void> {
    await this.stripe.products.update(
      externalProductId,
      {
        name: request.name,
        description: request.description,
      },
      { idempotencyKey },
    );
  }

  async createPrice(
    request: CreatePriceRequest,
    externalProductId: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.stripe.prices.create(
      {
        product: externalProductId,
        currency: 'USD',
        unit_amount: request.amount,
        recurring: {
          interval: 'month',
          interval_count: request.durationMonths,
        },
        metadata: {
          offerId: request.id,
        },
      },
      { idempotencyKey },
    );
  }

  createCustomer(
    request: CreateCustomerRequest,
    idempotencyKey: string,
  ): Promise<{ id: string }> {
    return this.stripe.customers.create(
      {
        email: request.email,
        metadata: { userId: request.userId },
      },
      { idempotencyKey },
    );
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
          initialPaymentId: request.internalPaymentId,
          userId: request.userId,
          offerId: request.offerId,
        },
      },
      metadata: {
        initialPaymentId: request.internalPaymentId,
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

  async activateProduct(
    externalProductId: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.stripe.products.update(
      externalProductId,
      { active: true },
      { idempotencyKey },
    );
  }

  async deactivateProduct(
    externalProductId: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.stripe.products.update(
      externalProductId,
      { active: false },
      { idempotencyKey },
    );
  }

  async deactivatePrice(
    externalPriceId: string,
    idempotencyKey: string,
  ): Promise<void> {
    await this.stripe.prices.update(
      externalPriceId,
      { active: false },
      { idempotencyKey },
    );
  }

  async getActiveSubscriptions(externalPriceId: string): Promise<string[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      price: externalPriceId,
      status: 'active',
    });

    return subscriptions.data.map((sub) => sub.id);
  }

  async deactivateSubscription(
    externalSubscriptionId: string,
    idempotencyKey: string,
    initiator: CancellationInitiator,
  ): Promise<void> {
    await this.stripe.subscriptions.update(
      externalSubscriptionId,
      {
        cancel_at_period_end: true,
        metadata: {
          canceled_by: initiator,
        },
      },
      { idempotencyKey },
    );
  }

  async constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Promise<WebhookEventResult | null> {
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

    const result = this.stripeEventParser.parse(event);

    if (!result) {
      throw new BadRequestException(
        `Unhandled webhook event type: ${event.type}`,
      );
    }

    return result;
  }
}
