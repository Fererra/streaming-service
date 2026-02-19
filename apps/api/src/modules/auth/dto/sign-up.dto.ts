import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxDate,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  readonly firstName: string;

  @IsString()
  @IsNotEmpty()
  readonly lastName: string;

  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  readonly password: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  @MaxDate(new Date())
  readonly dateOfBirth: Date;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  readonly country: string;
}
