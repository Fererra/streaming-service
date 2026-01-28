import { Injectable } from '@nestjs/common';
import { CreditRoleEntity } from '../entities/credit-role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  findCreditRolesByIds(ids: string[]): Promise<CreditRoleEntity[]> {
    return this.repository.find({ select: ['id'], where: { id: In(ids) } });
  }
}
