import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDecimal,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOfferDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  durationMonths: number;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;
}

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOfferDto)
  @ArrayMinSize(1, { message: 'At least one offer must be provided' })
  offers: CreateOfferDto[];
}
