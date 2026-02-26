import { EventType, PaymentEventMap } from './payment-events.interface';

export interface IPaymentQueueService {
  dispatchEvent<T extends EventType>(
    eventType: T,
    payload: PaymentEventMap[T],
  ): Promise<void>;
}
