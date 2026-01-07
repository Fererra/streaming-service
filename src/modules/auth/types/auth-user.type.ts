import { UserRoles } from 'src/modules/users/user-roles.enum';

export type AuthUser = {
  id: string;
  role: UserRoles;
};
