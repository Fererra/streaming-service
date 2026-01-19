import type { UserRole } from 'src/modules/users/user-role.enum';

export interface GenerateTokensParams {
  userId: string;
  role: UserRole;
}
