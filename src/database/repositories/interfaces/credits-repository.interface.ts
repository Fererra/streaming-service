import { CreditRoleEntity } from 'src/database/entities/credit-role.entity';

export interface ICreditsRepository {
  getAllCreditRoles(): Promise<CreditRoleEntity[]>;
  findCreditRolesByIds(ids: string[]): Promise<CreditRoleEntity[]>;
}
