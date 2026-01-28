import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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

  async validateExists(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
    }

    const foundRoles = await this.creditsRepository.findCreditRolesByIds(ids);

    if (foundRoles.length !== ids.length) {
      const foundIds = foundRoles.map((role) => role.id);
      const missingIds = ids.filter((id) => !foundIds.includes(id));

      throw new BadRequestException(
        `Credit roles not found for IDs: ${missingIds.join(', ')}`,
      );
    }
  }
}
