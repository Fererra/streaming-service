import { CommandPayload, CommandType } from '@app/payment';

export interface JobContext {
  jobId: string;
}

export interface IPaymentCommandHandler<T extends CommandType> {
  readonly commandType: T;

  handle(payload: CommandPayload<T>, context: JobContext): Promise<void>;
}
