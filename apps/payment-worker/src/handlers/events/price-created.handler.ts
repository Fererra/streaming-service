import {
  GATEWAY_PRICE_REPOSITORY,
  type IGatewayPriceRepository,
  PaymentGatewayProvider,
  PriceCreatedPayload,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { Inject } from '@nestjs/common';
import {
  type ISubscriptionOfferRepository,
  OfferStatus,
  SUBSCRIPTION_OFFER_REPOSITORY,
} from '@app/subscription';

export class PriceCreatedHandler implements IPaymentEventHandler<'event.price.created'> {
  readonly eventType = 'event.price.created' as const;

  constructor(
    @Inject(GATEWAY_PRICE_REPOSITORY)
    private readonly gatewayPriceRepository: IGatewayPriceRepository,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
  ) {}

  async handle(payload: PriceCreatedPayload): Promise<void> {
    const { externalId, offerId } = payload;

    if (!offerId) return;

    await this.gatewayPriceRepository.createGatewayPrice({
      gateway: PaymentGatewayProvider.STRIPE,
      externalPriceId: externalId,
      subscriptionOfferId: offerId,
    });

    const affected = await this.subscriptionOfferRepository.updateStatus(
      offerId,
      OfferStatus.ACTIVE,
    );

    if (affected === 0) {
      throw new Error(`Failed to activate offer with ID: ${offerId}`);
    }
  }
}
