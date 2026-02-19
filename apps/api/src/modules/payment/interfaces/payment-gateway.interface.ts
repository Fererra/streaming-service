import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';

export interface CreatePriceRequest {
  id: string;
  planName: string;
  amount: number;
  durationMonths: number;
  currency: string;
}

export interface CreateCustomerRequest {
  email: string;
  userId: string;
}

export interface CheckoutSessionRequest {
  userId: string;
  email: string;
  externalCustomerId: string;
  offerId: string;
  externalPriceId: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
}

export type WebhookEventType =
  | 'checkout.completed'
  | 'checkout.expired'
  | 'invoice.paid'
  | 'invoice.payment_failed';

export type Status =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid';

export interface WebhookEventResult {
  type: WebhookEventType;
  billingReason?: string | null;
  externalSessionId: string | null;
  externalSubscriptionId: string | null;
  externalPaymentId: string | null;
  cancelAtPeriodEnd?: boolean;
  status?: Status;
  metadata: Record<string, string>;
  amount?: number;
  currency?: string;
}
export interface PaymentGateway {
  readonly gateway: PaymentGatewayProvider;

  createPrice(offer: CreatePriceRequest): Promise<{ id: string }>;
  createCustomer(request: CreateCustomerRequest): Promise<{ id: string }>;
  createCheckoutSession(
    request: CheckoutSessionRequest,
  ): Promise<CheckoutSessionResponse>;
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Promise<WebhookEventResult>;
}
