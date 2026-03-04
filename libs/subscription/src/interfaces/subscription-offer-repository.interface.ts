import { SubscriptionOfferEntity } from '../entities/subscription-offer.entity';
import { OfferStatus } from '../enums/status.enum';

export interface ISubscriptionOfferRepository {
  findOfferByIdAndPlanId(
    offerId: string,
    planId: string,
  ): Promise<SubscriptionOfferEntity | null>;
  findDraftOffersByPlanId(planId: string): Promise<SubscriptionOfferEntity[]>;
  findActiveOffersByPlanId(planId: string): Promise<SubscriptionOfferEntity[]>;
  findPriceById(offerId: string): Promise<number | null>;
  findOffersByPlanAndDurations(
    planId: string,
    durations: number[],
  ): Promise<SubscriptionOfferEntity[]>;
  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]>;
  updateStatus(offerId: string, status: OfferStatus): Promise<number>;
}
