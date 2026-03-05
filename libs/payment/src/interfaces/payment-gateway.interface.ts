import { EventPayload, EventType } from '@app/payment';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';
import { CancellationInitiator } from '@app/shared';

export interface CreateProductRequest {
  id: string;
  name: string;
  description: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
}

export interface CreatePriceRequest {
  id: string;
  amount: number;
  durationMonths: number;
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
  internalPaymentId: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
}

export type WebhookEventResult = EventPayload<EventType> & {
  type: EventType;
};

export interface PaymentGateway {
  readonly gateway: PaymentGatewayProvider;

  createProduct(
    request: CreateProductRequest,
    idempotencyKey: string,
  ): Promise<{ id: string }>;
  updateProduct(
    externalProductId: string,
    request: UpdateProductRequest,
    idempotencyKey: string,
  ): Promise<void>;
  createPrice(
    offer: CreatePriceRequest,
    externalProductId: string,
    idempotencyKey: string,
  ): Promise<void>;
  createCustomer(
    request: CreateCustomerRequest,
    idempotencyKey: string,
  ): Promise<{ id: string }>;
  createCheckoutSession(
    request: CheckoutSessionRequest,
  ): Promise<CheckoutSessionResponse>;
  activateProduct(
    externalProductId: string,
    idempotencyKey: string,
  ): Promise<void>;
  getActiveSubscriptions(externalPriceId: string): Promise<string[]>;
  deactivateProduct(
    externalProductId: string,
    idempotencyKey: string,
  ): Promise<void>;
  deactivatePrice(
    externalPriceId: string,
    idempotencyKey: string,
  ): Promise<void>;
  deactivateSubscription(
    externalSubscriptionId: string,
    idempotencyKey: string,
    initiator: CancellationInitiator,
  ): Promise<void>;
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Promise<WebhookEventResult | null>;
}
