import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';

export interface ISubscriptionOfferRepository {
  findOffersByPlanAndDurations(
    planId: string,
    durations: number[],
  ): Promise<SubscriptionOfferEntity[]>;
  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]>;
}
