import { Injectable } from '@nestjs/common';
import { CreditRoleEntity } from '../entities/credit-role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICreditsRepository } from './interfaces/credits-repository.interface';

@Injectable()
export class CreditsRepository implements ICreditsRepository {
  constructor(
    @InjectRepository(CreditRoleEntity)
    private readonly repository: Repository<CreditRoleEntity>,
  ) {}

  getAllCreditRoles(): Promise<CreditRoleEntity[]> {
    return this.repository.find({ order: { role: 'ASC' } });
  }
}
