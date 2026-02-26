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

export type PaymentEventMap = {
  'checkout.completed': CheckoutCompletedPayload;
  'checkout.expired': CheckoutExpiredPayload;
  'invoice.paid': InvoicePaidPayload;
  'invoice.payment_failed': InvoicePaymentFailedPayload;
};

export type EventType = keyof PaymentEventMap;
export type EventPayload<T extends EventType> = PaymentEventMap[T];
