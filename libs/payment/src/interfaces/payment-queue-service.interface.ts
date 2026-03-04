import { CommandPayload, CommandType } from './payment-command.interface';
import { EventPayload, EventType } from './payment-events.interface';

export interface IPaymentQueueService {
  dispatchEvent<T extends EventType>(
    eventType: T,
    payload: EventPayload<T>,
  ): Promise<void>;
  dispatchCommand<T extends CommandType>(
    eventType: T,
    payload: CommandPayload<T>,
  ): Promise<void>;
  dispatchCommandsBulk<T extends CommandType>(
    commands: { name: T; data: CommandPayload<T> }[],
  ): Promise<void>;
}
