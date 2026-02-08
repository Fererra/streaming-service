import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';

export interface ISubscriptionOfferRepository {
  findOffersByPlanAndDurations(
    planId: string,
    durations: number[],
  ): Promise<SubscriptionOfferEntity[]>;
  findByIdAndPlanId(
    offerId: string,
    planId: string,
    options?: { withDeleted?: boolean },
  ): Promise<SubscriptionOfferEntity | null>;
  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]>;
  activateOffer(offer: Partial<SubscriptionOfferEntity>): Promise<void>;
  deactivateOffer(offer: Partial<SubscriptionOfferEntity>): Promise<void>;
}
