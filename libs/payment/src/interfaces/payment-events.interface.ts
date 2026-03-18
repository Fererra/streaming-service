import { CancellationReason, UserSubscriptionStatus } from '@app/shared';

export interface BaseEventPayload {
  externalEventId: string;
}

export interface GatewayEntityCreatedBase extends BaseEventPayload {
  externalId: string;
}

export interface ProductCreatedPayload extends GatewayEntityCreatedBase {
  planId: string;
}

export interface ProductUpdatedPayload extends ProductCreatedPayload {
  updates: {
    name?: string;
    description?: string;
    isActive?: boolean;
  };
}

export interface PriceCreatedPayload extends GatewayEntityCreatedBase {
  offerId: string;
}

export interface PriceUpdatedPayload extends PriceCreatedPayload {
  isActive: boolean;
}

export interface PaymentMetadata {
  initialPaymentId: string;
  userId: string;
  offerId: string;
}

export interface BasePaymentPayload extends BaseEventPayload {
  externalInvoiceId: string | null;
  metadata: PaymentMetadata;
}

export interface CheckoutEventPayload extends BasePaymentPayload {
  externalSessionId: string;
}

export interface InvoiceEventPayload extends BasePaymentPayload {
  externalSubscriptionId: string;
  billingReason: string | null;
  currentPeriodEnd: Date | null;
  paidAt: Date | null;
  amount: number;
  currency: string;
}

export interface SubscriptionUpdatedPayload extends BaseEventPayload {
  externalSubscriptionId: string;
  updates: {
    status?: UserSubscriptionStatus;
    cancellation?: {
      reason: CancellationReason | null;
      canceledAt: Date | null;
    };
  };
}

export interface SubscriptionDeletedPayload extends BaseEventPayload {
  type: 'event.subscription.deleted';
  externalSubscriptionId: string;
  status: UserSubscriptionStatus;
  cancellationReason: CancellationReason;
  canceledAt: Date | null;
}

export type CheckoutCompletedPayload = CheckoutEventPayload;
export type CheckoutExpiredPayload = CheckoutEventPayload;

export type InvoicePaidPayload = InvoiceEventPayload;
export type InvoicePaymentFailedPayload = InvoiceEventPayload;

export type WebhookEventMap = {
  'event.product.created': ProductCreatedPayload;
  'event.product.updated': ProductUpdatedPayload;
  'event.price.created': PriceCreatedPayload;
  'event.price.updated': PriceUpdatedPayload;
  'event.checkout.completed': CheckoutCompletedPayload;
  'event.checkout.expired': CheckoutExpiredPayload;
  'event.invoice.paid': InvoicePaidPayload;
  'event.invoice.payment_failed': InvoicePaymentFailedPayload;
  'event.subscription.updated': SubscriptionUpdatedPayload;
  'event.subscription.deleted': SubscriptionDeletedPayload;
};

export type EventType = keyof WebhookEventMap;
export type EventPayload<T extends EventType> = WebhookEventMap[T];
