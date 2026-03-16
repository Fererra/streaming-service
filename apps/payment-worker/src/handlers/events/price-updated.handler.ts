import { PriceUpdatedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { Inject, Injectable } from '@nestjs/common';
import {
  type ISubscriptionOfferRepository,
  OfferStatus,
  SUBSCRIPTION_OFFER_REPOSITORY,
} from '@app/subscription';

@Injectable()
export class PriceUpdatedHandler implements IPaymentEventHandler<'event.price.updated'> {
  readonly eventType = 'event.price.updated' as const;

  constructor(
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
  ) {}

  async handle(payload: PriceUpdatedPayload): Promise<void> {
    const { offerId, isActive } = payload;

    if (!offerId) return;

    const newStatus = isActive ? OfferStatus.ACTIVE : OfferStatus.DEACTIVATED;
    await this.subscriptionOfferRepository.updateStatus(offerId, newStatus);
  }
}
