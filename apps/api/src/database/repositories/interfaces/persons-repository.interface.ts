import { RepositoryPaginatedResult } from '../../../common/@types/pagination.types';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PersonEntity } from '../../entities/person.entity';

export interface IPersonsRepository {
  findPhotoPathById(id: string): Promise<string | null>;
  findAll(
    paginationOptions: PaginationQueryDto,
    search?: string,
  ): Promise<RepositoryPaginatedResult<PersonEntity>>;
  findByIds(ids: string[]): Promise<PersonEntity[]>;
  existsById(id: string): Promise<boolean>;
  create(data: Partial<PersonEntity>): Promise<PersonEntity>;
  update(id: string, data: Partial<PersonEntity>): Promise<void>;
  swapPhotoPath(id: string, newPhotoPath: string): Promise<string | null>;
  delete(id: string): Promise<void>;
}
