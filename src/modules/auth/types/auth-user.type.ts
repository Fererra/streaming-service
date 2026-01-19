import { UserRole } from 'src/modules/users/user-role.enum';

export type AuthUser = {
  id: string;
  role: UserRole;
};
