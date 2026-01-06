import type { UserRoles } from 'src/modules/users/user-roles.enum';

export interface GenerateTokensParams {
  userId: string;
  role: UserRoles;
}
