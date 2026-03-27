import {
  CommandPayload,
  CommandType,
  EventPayload,
  EventType,
} from '@app/payment';

export interface DlqJobData<T> {
  originalJobId: string;
  payload: T;
  error: string;
  stack?: string;
  failedAt: string;
}

export type CommandDlqJobData<T extends CommandType> = DlqJobData<
  CommandPayload<T>
>;
export type EventDlqJobData<T extends EventType> = DlqJobData<EventPayload<T>>;
