import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionDto } from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(
  OmitType(CreateSubscriptionDto, ['offers'] as const),
) {}
