import type { WebhookEventResult } from './payment-gateway.interface';

export interface WebhookEventHandler {
  readonly eventType: WebhookEventResult['type'];
  handle(event: WebhookEventResult): Promise<void>;
}
