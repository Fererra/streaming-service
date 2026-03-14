import { CommandPayload, CommandType } from '@app/payment';

export interface IPaymentCommandHandler<T extends CommandType> {
  readonly commandType: T;

  handle(payload: CommandPayload<T>): Promise<void>;
}
