import { Injectable } from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-subscription.dto';
import { SubscriptionOfferEntity } from '../../../database/entities/subscription-offer.entity';

@Injectable()
export class OfferEntityFactory {
  createFromDto(
    offers: CreateOfferDto[],
    subscriptionPlanId?: string,
  ): Partial<SubscriptionOfferEntity>[] {
    return offers.map(
      (offer) =>
        ({
          isActive: false,
          durationMonths: offer.durationMonths,
          price: offer.price,
          ...(subscriptionPlanId && {
            subscriptionPlan: { id: subscriptionPlanId },
          }),
        }) as Partial<SubscriptionOfferEntity>,
    );
  }
}
