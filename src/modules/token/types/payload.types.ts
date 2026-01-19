import type { UserRole } from 'src/modules/users/user-role.enum';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
};
