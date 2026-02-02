import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class MovieSearchQueryDto extends PaginationQueryDto {
  @IsNotEmpty()
  @IsString()
  title: string;
}
