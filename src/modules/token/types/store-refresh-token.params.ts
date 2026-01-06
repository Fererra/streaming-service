import type { StringValue } from 'ms';

export type StoreRefreshTokenParams = {
  userId: string;
  jti: string;
  token: string;
  expiresIn: StringValue | number;
};
