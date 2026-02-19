import { CreditRoleEntity } from '../../entities/credit-role.entity';

export interface ICreditsRepository {
  getAllCreditRoles(): Promise<CreditRoleEntity[]>;
  findCreditRolesByIds(ids: string[]): Promise<CreditRoleEntity[]>;
}
