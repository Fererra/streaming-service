export interface GatewayEntityCreatedBase {
  externalId: string;
}

export interface ProductCreatedPayload extends GatewayEntityCreatedBase {
  planId: string;
}

export type ProductUpdatedPayload = ProductCreatedPayload;

export interface PriceCreatedPayload extends GatewayEntityCreatedBase {
  offerId: string;
}

export interface PaymentMetadata {
  userId: string;
  offerId: string;
}

export interface BasePaymentPayload {
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

export type CheckoutCompletedPayload = CheckoutEventPayload;
export type CheckoutExpiredPayload = CheckoutEventPayload;

export type InvoicePaidPayload = InvoiceEventPayload;
export type InvoicePaymentFailedPayload = InvoiceEventPayload;

export type WebhookEventMap = {
  'event.product.created': ProductCreatedPayload;
  'event.product.updated': ProductUpdatedPayload;
  'event.price.created': PriceCreatedPayload;
  'event.checkout.completed': CheckoutCompletedPayload;
  'event.checkout.expired': CheckoutExpiredPayload;
  'event.invoice.paid': InvoicePaidPayload;
  'event.invoice.payment_failed': InvoicePaymentFailedPayload;
};

export type EventType = keyof WebhookEventMap;
export type EventPayload<T extends EventType> = WebhookEventMap[T];
