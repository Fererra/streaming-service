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
          durationMonths: offer.durationMonths,
          price: this.priceToCents(offer.price),
          ...(subscriptionPlanId && {
            subscriptionPlan: { id: subscriptionPlanId },
          }),
        }) as Partial<SubscriptionOfferEntity>,
    );
  }

  private priceToCents(price: number): number {
    return Math.round(price * 100);
  }
}
