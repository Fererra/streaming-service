import { ILike, In, Repository } from 'typeorm';
import { PersonEntity } from '../entities/person.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { IPersonsRepository } from './interfaces/persons-repository.interface';
import {
  PaginationOptions,
  RepositoryPaginatedResult,
} from 'src/common/@types/pagination.types';

@Injectable()
export class PersonsRepository implements IPersonsRepository {
  constructor(
    @InjectRepository(PersonEntity)
    private readonly repository: Repository<PersonEntity>,
  ) {}

  async findPhotoPathById(id: string): Promise<string | null> {
    const person = await this.repository.findOne({
      select: ['photoPath'],
      where: { id },
    });

    return person?.photoPath ?? null;
  }

  findAll(
    options: PaginationOptions,
    search?: string,
  ): Promise<RepositoryPaginatedResult<PersonEntity>> {
    const where = search
      ? [
          { firstName: ILike(`%${search}%`) },
          { lastName: ILike(`%${search}%`) },
        ]
      : undefined;

    const skip = (options.page - 1) * options.limit;
    const take = options.limit;

    return this.repository.findAndCount({
      select: ['id', 'firstName', 'lastName', 'photoPath'],
      where,
      skip,
      take,
    });
  }

  findByIds(ids: string[]): Promise<PersonEntity[]> {
    return this.repository.find({ select: ['id'], where: { id: In(ids) } });
  }

  existsById(id: string): Promise<boolean> {
    return this.repository.existsBy({ id });
  }

  create(data: Partial<PersonEntity>): Promise<PersonEntity> {
    return this.repository.save(data);
  }

  async update(id: string, data: Partial<PersonEntity>): Promise<void> {
    await this.repository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
