import { RepositoryPaginatedResult } from 'src/common/@types/pagination.types';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PersonEntity } from 'src/database/entities/person.entity';

export interface IPersonsRepository {
  findPhotoPathById(id: string): Promise<string | null>;
  findAll(
    paginationOptions: PaginationQueryDto,
    search?: string,
  ): Promise<RepositoryPaginatedResult<PersonEntity>>;
  existsById(id: string): Promise<boolean>;
  create(data: Partial<PersonEntity>): Promise<PersonEntity>;
  update(id: string, data: Partial<PersonEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}
