import { Controller, Get, Query } from '@nestjs/common';
import { PersonsService } from './services/persons.service';
import { PaginationResponse } from '../../common/@types/pagination.types';
import { PersonEntity } from '../../database/entities/person.entity';
import { PersonSearchQueryDto } from './dto/person-search-query.dto';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Get()
  getAllPersons(
    @Query() paginationOptions: PersonSearchQueryDto,
  ): Promise<PaginationResponse<PersonEntity>> {
    const { search, ...options } = paginationOptions;
    return this.personsService.findAll(options, search);
  }
}
