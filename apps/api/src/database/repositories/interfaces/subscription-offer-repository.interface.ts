import { SubscriptionOfferEntity } from '../../entities/subscription-offer.entity';

export interface ISubscriptionOfferRepository {
  existsByDurationAndPlan(
    planId: string,
    durationMonths: number,
  ): Promise<boolean>;
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
  update(
    offerId: string,
    planId: string,
    updateData: Partial<SubscriptionOfferEntity>,
  ): Promise<number>;
  activateOffer(offer: Partial<SubscriptionOfferEntity>): Promise<void>;
  deactivateOffer(offer: Partial<SubscriptionOfferEntity>): Promise<void>;
}
