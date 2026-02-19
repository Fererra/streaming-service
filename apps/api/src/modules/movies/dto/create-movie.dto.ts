import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { AgeRating } from '../age-rating.enum';
import { Type } from 'class-transformer';

export class CreateCreditRoleDto {
  @IsUUID('all')
  @IsNotEmpty()
  roleId: string;

  @IsOptional()
  @IsString()
  characterName: string | null;

  @IsOptional()
  @IsInt()
  orderIndex: number;
}

export class CreateCreditsDto {
  @IsUUID('all')
  @IsNotEmpty()
  personId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCreditRoleDto)
  roles: CreateCreditRoleDto[];
}

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(AgeRating)
  @IsNotEmpty()
  ageRating: AgeRating;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  durationMinutes: number;

  @IsInt()
  @IsNotEmpty()
  releaseYear: number;

  @IsOptional()
  @IsString()
  description: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(2, 2, { each: true })
  countryCodes: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  genreIds: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCreditsDto)
  credits: CreateCreditsDto[];
}
