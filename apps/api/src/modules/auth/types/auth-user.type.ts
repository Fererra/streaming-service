import { UserRole } from '../../../modules/users/user-role.enum';

export type AuthUser = {
  id: string;
  role: UserRole;
};
