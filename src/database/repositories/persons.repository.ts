import { ILike, In, Repository } from 'typeorm';
import { PersonEntity } from '../entities/person.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
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

  async swapPhotoPath(
    personId: string,
    newPhotoPath: string,
  ): Promise<string | null> {
    return this.repository.manager.transaction(async (manager) => {
      const person = await manager.findOne(PersonEntity, {
        select: ['id', 'photoPath'],
        where: { id: personId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!person) {
        throw new NotFoundException('Person not found');
      }

      const oldPhotoPath = person.photoPath;

      await manager.update(
        PersonEntity,
        { id: personId },
        { photoPath: newPhotoPath },
      );

      return oldPhotoPath;
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
