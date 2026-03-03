import { OfferStatus } from '../../../modules/subscription/enums/status.enum';
import { SubscriptionOfferEntity } from '../../entities/subscription-offer.entity';

export interface ISubscriptionOfferRepository {
  findOffersByPlanAndDurations(
    planId: string,
    durations: number[],
  ): Promise<SubscriptionOfferEntity[]>;
  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]>;
  updateStatus(
    offerId: string,
    planId: string,
    status: OfferStatus,
  ): Promise<number>;
}
