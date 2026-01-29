import { OmitType, PartialType, PickType } from '@nestjs/mapped-types';
import { CreateMovieDto } from './create-movie.dto';

export class UpdateMovieDto extends PartialType(
  OmitType(CreateMovieDto, ['genreIds', 'countryCodes', 'credits'] as const),
) {}

export class UpdateMovieCountriesDto extends PickType(CreateMovieDto, [
  'countryCodes',
] as const) {}

export class UpdateMovieGenresDto extends PickType(CreateMovieDto, [
  'genreIds',
] as const) {}
