import { Inject, Injectable } from '@nestjs/common';
import { CreditRoleEntity } from 'src/database/entities/credit-role.entity';
import type { ICreditsRepository } from 'src/database/repositories/interfaces/credits-repository.interface';
import { CREDITS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';

@Injectable()
export class CreditsService {
  constructor(
    @Inject(CREDITS_REPOSITORY)
    private readonly creditsRepository: ICreditsRepository,
  ) {}

  getAllCreditRoles(): Promise<CreditRoleEntity[]> {
    return this.creditsRepository.getAllCreditRoles();
  }
}
