import { SubscriptionOfferEntity } from '../../entities/subscription-offer.entity';

export interface ISubscriptionOfferRepository {
  findOffersByPlanAndDurations(
    planId: string,
    durations: number[],
  ): Promise<SubscriptionOfferEntity[]>;
  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]>;
  activateOffersByIds(offerIds: string[]): Promise<number>;
  deactivateOffer(offerId: string, planId: string): Promise<number>;
}
