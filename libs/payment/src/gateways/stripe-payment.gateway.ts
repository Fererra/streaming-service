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
} from '../interfaces/payment-gateway.interface';
import { STRIPE_CLIENT } from '../constants/constants';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';
import { PaymentMetadata } from '../interfaces/payment-events.interface';
import { CancellationReason, CancellationInitiator } from '@app/shared';

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

  private readonly eventHandlers = new Map<
    string,
    (data: Stripe.Event) => WebhookEventResult | null
  >([
    [
      'product.created',
      (event) => {
        const product = event.data.object as Stripe.Product;

        return {
          type: 'event.product.created',
          externalId: product.id,
          planId: product.metadata.planId,
        };
      },
    ],
    [
      'product.updated',
      (event) => {
        const product = event.data.object as Stripe.Product;
        const previousAttributes = event.data
          .previous_attributes as Partial<Stripe.Product>;

        if (previousAttributes && previousAttributes.active !== undefined) {
          return {
            type: 'event.product.updated',
            externalId: product.id,
            planId: product.metadata.planId,
            isActive: product.active,
          };
        }

        return null;
      },
    ],
    [
      'price.created',
      (event) => {
        const price = event.data.object as Stripe.Price;

        return {
          type: 'event.price.created',
          externalId: price.id,
          offerId: price.metadata.offerId,
        };
      },
    ],
    [
      'price.updated',
      (event) => {
        const price = event.data.object as Stripe.Price;
        const previousAttributes = event.data
          .previous_attributes as Partial<Stripe.Price>;

        if (previousAttributes && previousAttributes.active !== undefined) {
          return {
            type: 'event.price.updated',
            externalId: price.id,
            offerId: price.metadata.offerId,
            isActive: price.active,
          };
        }

        return null;
      },
    ],
    [
      'checkout.session.completed',
      (event) => {
        const session = event.data.object as Stripe.Checkout.Session;

        return {
          type: 'event.checkout.completed',
          externalSessionId: session.id,
          externalInvoiceId: session.invoice as string,
          metadata: (session.metadata as unknown as PaymentMetadata) ?? {},
        };
      },
    ],
    [
      'checkout.session.expired',
      (event) => {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          type: 'event.checkout.expired',
          externalSessionId: session.id,
          externalInvoiceId: session.invoice as string,
          metadata: (session.metadata as unknown as PaymentMetadata) ?? {},
        };
      },
    ],
    [
      'invoice.paid',
      (event) => {
        const invoice = event.data.object as Stripe.Invoice;

        return {
          type: 'event.invoice.paid',
          billingReason: invoice.billing_reason,
          externalSessionId: null,
          externalSubscriptionId: invoice.parent?.subscription_details
            ?.subscription as string,
          externalInvoiceId: invoice.id as string,
          paidAt: this.fromStripeTs(invoice.status_transitions.paid_at),
          currentPeriodEnd: this.fromStripeTs(invoice.lines.data[0].period.end),
          metadata:
            (invoice.lines.data[0].metadata as unknown as PaymentMetadata) ??
            {},
          amount: invoice.amount_paid,
          currency: invoice.currency,
        };
      },
    ],
    [
      'invoice.payment_failed',
      (event) => {
        const invoice = event.data.object as Stripe.Invoice;
        return {
          type: 'event.invoice.payment_failed',
          billingReason: invoice.billing_reason,
          externalSessionId: null,
          externalSubscriptionId: invoice.parent?.subscription_details
            ?.subscription as string,
          externalInvoiceId: invoice.id as string,
          paidAt: null,
          currentPeriodEnd: null,
          metadata:
            (invoice.lines.data[0].metadata as unknown as PaymentMetadata) ??
            {},
          amount: invoice.amount_due,
          currency: invoice.currency,
        };
      },
    ],
    [
      'customer.subscription.updated',
      (event: Stripe.Event) => {
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = event.data
          .previous_attributes as Partial<Stripe.Subscription>;

        if (
          previousAttributes &&
          previousAttributes.cancel_at_period_end !== undefined
        ) {
          const canceledByMeta = subscription.metadata?.canceled_by as
            | CancellationInitiator
            | undefined;

          const reason = this.resolveCancellationReason(
            canceledByMeta,
            subscription.cancellation_details?.reason,
          );

          return {
            type: 'event.subscription.updated',
            externalSubscriptionId: subscription.id,
            cancellationReason: reason,
            canceledAt: this.fromStripeTs(subscription.canceled_at),
          };
        }

        return null;
      },
    ],
    // ['customer.subscription.deleted', (obj) => {}],
  ]);

  private fromStripeTs = (ts?: number | null): Date | null =>
    ts ? new Date(ts * 1000) : null;

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

    const handler = this.eventHandlers.get(event.type);

    if (!handler) {
      throw new BadRequestException(
        `Unhandled webhook event type: ${event.type}`,
      );
    }

    return handler(event);
  }

  private readonly initiatorToReasonMap = new Map<
    CancellationInitiator,
    CancellationReason
  >([
    [CancellationInitiator.ADMIN, CancellationReason.ADMIN_CANCELED],
    [CancellationInitiator.USER, CancellationReason.USER_CANCELED],
  ]);

  private readonly stripeReasonMap = new Map<string, CancellationReason>([
    ['cancellation_requested', CancellationReason.ADMIN_CANCELED],
    ['payment_failed', CancellationReason.PAYMENT_FAILED],
  ]);

  private resolveCancellationReason(
    initiator?: CancellationInitiator,
    stripeReason?: string | null,
  ): CancellationReason {
    if (initiator) {
      return (
        this.initiatorToReasonMap.get(initiator) ?? CancellationReason.OTHER
      );
    }

    if (stripeReason) {
      return this.stripeReasonMap.get(stripeReason) ?? CancellationReason.OTHER;
    }

    return CancellationReason.OTHER;
  }
}
