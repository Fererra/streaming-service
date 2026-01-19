import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class UserSearchQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
