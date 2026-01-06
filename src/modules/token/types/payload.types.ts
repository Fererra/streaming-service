import type { UserRoles } from 'src/modules/users/user-roles.enum';

export type AccessTokenPayload = {
  sub: string;
  role: UserRoles;
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
};
