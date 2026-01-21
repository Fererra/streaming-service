import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsString,
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

  @IsDateString()
  @IsNotEmpty()
  @MaxDate(new Date())
  readonly dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  readonly country: string;
}
