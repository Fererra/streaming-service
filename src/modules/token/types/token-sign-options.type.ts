import type { StringValue } from 'ms';

export type TokenSignOptions = {
  secret: string;
  expiresIn: StringValue | number;
};
