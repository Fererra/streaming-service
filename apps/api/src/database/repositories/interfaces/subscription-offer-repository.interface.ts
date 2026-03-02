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
  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]>;
  update(
    offerId: string,
    planId: string,
    updateData: Partial<SubscriptionOfferEntity>,
  ): Promise<number>;
  activateOffersByIds(offerIds: string[]): Promise<number>;
  activateOffer(offerId: string, planId: string): Promise<number>;
  deactivateOffer(offerId: string, planId: string): Promise<number>;
}
