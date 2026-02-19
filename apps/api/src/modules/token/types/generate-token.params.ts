import type { UserRole } from '../../users/user-role.enum';

export interface GenerateTokensParams {
  userId: string;
  role: UserRole;
}
