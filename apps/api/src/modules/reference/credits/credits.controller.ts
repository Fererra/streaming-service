import { Controller, Get } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { CreditRoleEntity } from '../../../database/entities/credit-role.entity';

@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get()
  getAllCreditRoles(): Promise<CreditRoleEntity[]> {
    return this.creditsService.getAllCreditRoles();
  }
}
