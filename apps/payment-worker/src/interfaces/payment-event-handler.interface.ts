import { EventPayload, EventType } from '@app/payment';

export interface IPaymentEventHandler<T extends EventType> {
  readonly eventType: T;

  handle(payload: EventPayload<T>): Promise<void>;
}
