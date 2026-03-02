import { EventPayload, EventType } from '@app/payment';
import { PaymentGatewayProvider } from '@app/payment';

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

export type WebhookEventResult = EventPayload<EventType> & {
  type: EventType;
};

export interface PaymentGateway {
  readonly gateway: PaymentGatewayProvider;

  createProduct(request: CreateProductRequest): Promise<{ id: string }>;
  updateProduct(
    externalProductId: string,
    request: UpdateProductRequest,
  ): Promise<void>;
  createPrice(
    offer: CreatePriceRequest,
    externalProductId: string,
  ): Promise<{ id: string }>;
  createCustomer(request: CreateCustomerRequest): Promise<{ id: string }>;
  createCheckoutSession(
    request: CheckoutSessionRequest,
  ): Promise<CheckoutSessionResponse>;
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Promise<WebhookEventResult>;
}
