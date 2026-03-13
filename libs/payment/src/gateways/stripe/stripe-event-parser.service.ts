import {
  PaymentMetadata,
  SubscriptionUpdatedPayload,
} from '@app/payment/interfaces/payment-events.interface';
import { WebhookEventResult } from '@app/payment/interfaces/payment-gateway.interface';
import {
  UserSubscriptionStatus,
  CancellationInitiator,
  CancellationReason,
} from '@app/shared';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeEventParser {
  private readonly parsers = new Map<
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
        if (!previousAttributes) return null;

        const updates: SubscriptionUpdatedPayload['updates'] = {};

        if (previousAttributes.status !== undefined) {
          updates.status =
            subscription.status as unknown as UserSubscriptionStatus;
        }

        if (
          previousAttributes.cancel_at_period_end !== undefined &&
          subscription.cancel_at_period_end === true
        ) {
          const canceledByMeta = subscription.metadata
            ?.canceled_by as CancellationInitiator;
          updates.cancellation = {
            reason: this.resolveCancellationReason(
              canceledByMeta,
              subscription.cancellation_details?.reason,
            ),
            canceledAt: this.fromStripeTs(subscription.canceled_at),
          };
        }

        if (Object.keys(updates).length === 0) return null;

        return {
          type: 'event.subscription.updated',
          externalSubscriptionId: subscription.id,
          updates,
        };
      },
    ],
    [
      'customer.subscription.deleted',
      (event: Stripe.Event) => {
        const subscription = event.data.object as Stripe.Subscription;

        const canceledByMeta = subscription.metadata
          ?.canceled_by as CancellationInitiator;

        const reason = this.resolveCancellationReason(
          canceledByMeta,
          subscription.cancellation_details?.reason,
        );

        return {
          type: 'event.subscription.deleted',
          externalSubscriptionId: subscription.id,
          status: subscription.status as unknown as UserSubscriptionStatus,
          cancellationReason: reason,
          canceledAt: this.fromStripeTs(subscription.canceled_at),
        };
      },
    ],
  ]);

  parse(event: Stripe.Event): WebhookEventResult | null {
    const handler = this.parsers.get(event.type);
    return handler ? handler(event) : null;
  }

  private fromStripeTs = (ts?: number | null): Date | null =>
    ts ? new Date(ts * 1000) : null;

  private readonly initiatorToReasonMap = new Map<
    CancellationInitiator,
    CancellationReason
  >([
    [CancellationInitiator.ADMIN, CancellationReason.ADMIN_CANCELED],
    [CancellationInitiator.USER, CancellationReason.USER_CANCELED],
  ]);

  private resolveCancellationReason(
    initiator?: CancellationInitiator,
    stripeReason?: string | null,
  ): CancellationReason {
    if (stripeReason === 'payment_failed') {
      return CancellationReason.PAYMENT_FAILED;
    }

    if (initiator) {
      return (
        this.initiatorToReasonMap.get(initiator) ?? CancellationReason.OTHER
      );
    }

    if (stripeReason === 'cancellation_requested') {
      return CancellationReason.ADMIN_CANCELED;
    }

    return CancellationReason.OTHER;
  }
}
