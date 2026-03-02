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
import { STRIPE_CLIENT } from '../payment.tokens';
import { PaymentGatewayProvider, PaymentMetadata } from '@app/payment';

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

  async createProduct(request: CreateProductRequest): Promise<{ id: string }> {
    const product = await this.stripe.products.create({
      name: request.name,
      description: request.description,
      metadata: {
        productId: request.id,
      },
    });

    return { id: product.id };
  }

  async updateProduct(
    externalProductId: string,
    request: UpdateProductRequest,
  ): Promise<void> {
    await this.stripe.products.update(externalProductId, {
      name: request.name,
      description: request.description,
    });
  }

  async createPrice(
    request: CreatePriceRequest,
    externalProductId: string,
  ): Promise<{ id: string }> {
    const price = await this.stripe.prices.create({
      product: externalProductId,
      currency: request?.currency ?? 'USD',
      unit_amount: request.amount,
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

  async deactivatePrice(externalPriceId: string): Promise<void> {
    await this.stripe.prices.update(externalPriceId, { active: false });
  }

  async deactivateSubscriptions(externalPriceId: string): Promise<void> {
    const subscriptions = await this.stripe.subscriptions.list({
      price: externalPriceId,
      status: 'active',
    });

    await Promise.all(
      subscriptions.data.map((sub) =>
        this.stripe.subscriptions.update(sub.id, {
          cancel_at_period_end: true,
        }),
      ),
    );
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
          externalInvoiceId: session.invoice as string,
          metadata: (session.metadata as unknown as PaymentMetadata) ?? {},
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
          externalInvoiceId: session.invoice as string,
          metadata: (session.metadata as unknown as PaymentMetadata) ?? {},
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
      (obj) => {
        const invoice = obj as Stripe.Invoice;
        return {
          type: 'invoice.payment_failed',
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
    // ['customer.subscription.deleted', (obj) => {}],
  ]);

  private fromStripeTs = (ts?: number | null): Date | null =>
    ts ? new Date(ts * 1000) : null;

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
