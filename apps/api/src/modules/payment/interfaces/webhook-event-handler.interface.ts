import type {
  WebhookEventResult,
  WebhookEventType,
} from './payment-gateway.interface';

export interface WebhookEventHandler {
  readonly eventType: WebhookEventType;
  handle(event: WebhookEventResult): Promise<void>;
}
