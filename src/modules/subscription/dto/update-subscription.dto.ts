import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  CreateOfferDto,
  CreateSubscriptionDto,
} from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(
  OmitType(CreateSubscriptionDto, ['offers'] as const),
) {}

export class UpdateOfferDto extends PartialType(CreateOfferDto) {}
