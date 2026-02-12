import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsNotEmpty()
  @IsString()
  offerId: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
