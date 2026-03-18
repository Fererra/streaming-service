import { PaymentMetadata, WebhookEventResult } from '@app/payment';
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
          externalEventId: event.id,
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
        const prev = event.data.previous_attributes as Partial<Stripe.Product>;

        if (!prev) return null;

        const updates = this.pickChanged(prev, product, {
          name: {
            prevKey: 'name',
            get: (p) => p.name,
          },
          description: {
            prevKey: 'description',
            get: (p) => p.description ?? undefined,
          },
          isActive: {
            prevKey: 'active',
            get: (p) => p.active,
          },
        });

        if (Object.keys(updates).length === 0) return null;

        return {
          externalEventId: event.id,
          type: 'event.product.updated',
          externalId: product.id,
          planId: product.metadata.planId,
          updates,
        };
      },
    ],
    [
      'price.created',
      (event) => {
        const price = event.data.object as Stripe.Price;

        return {
          externalEventId: event.id,

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
            externalEventId: event.id,
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
          externalEventId: event.id,
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
          externalEventId: event.id,
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
          externalEventId: event.id,
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
          externalEventId: event.id,
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
        const prev = event.data
          .previous_attributes as Partial<Stripe.Subscription>;

        if (!prev) return null;

        const updates = this.pickChanged(prev, subscription, {
          status: {
            prevKey: 'status',
            get: (s) => s.status as unknown as UserSubscriptionStatus,
          },
          cancellation: {
            prevKey: 'cancel_at_period_end',
            condition: (_, s) => s.cancel_at_period_end === true,
            get: (s) => ({
              reason: this.resolveCancellationReason(
                s.metadata?.canceled_by as CancellationInitiator,
                s.cancellation_details?.reason,
              ),
              canceledAt: this.fromStripeTs(s.canceled_at),
            }),
          },
        });

        if (Object.keys(updates).length === 0) return null;

        return {
          externalEventId: event.id,
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
          externalEventId: event.id,
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

  private pickChanged<TPrev, TCurr, TResult>(
    prev: TPrev,
    curr: TCurr,
    map: {
      [K in keyof TResult]: {
        prevKey: keyof TPrev;
        get: (curr: TCurr) => TResult[K];
        condition?: (prev: TPrev, curr: TCurr) => boolean;
      };
    },
  ): Partial<TResult> {
    const result: Partial<TResult> = {};

    for (const key in map) {
      const cfg = map[key];
      if (prev[cfg.prevKey] === undefined) continue;

      if (cfg.condition && !cfg.condition(prev, curr)) continue;

      result[key] = cfg.get(curr);
    }

    return result;
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
