import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxDate,
} from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  readonly firstName: string;

  @IsString()
  @IsNotEmpty()
  readonly lastName: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  @MaxDate(new Date())
  readonly dateOfBirth: Date;

  @IsString()
  @IsOptional()
  readonly biography?: string | undefined;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  readonly country: string;
}
