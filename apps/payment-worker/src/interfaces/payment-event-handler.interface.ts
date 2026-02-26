import { EventType, PaymentEventMap } from '@app/payment';

export interface IPaymentEventHandler<T extends EventType> {
  readonly eventType: T;

  handle(payload: PaymentEventMap[T]): Promise<void>;
}
