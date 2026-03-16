import {
  ProductCreatedPayload,
  PaymentGatewayProvider,
  PAYMENT_QUEUE_SERVICE,
  type IPaymentQueueService,
  SubscriptionPlanGatewayProductEntity,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { Inject, Injectable } from '@nestjs/common';
import {
  type ISubscriptionOfferRepository,
  SUBSCRIPTION_OFFER_REPOSITORY,
} from '@app/subscription';
import { DataSource } from 'typeorm';

@Injectable()
export class ProductCreatedHandler implements IPaymentEventHandler<'event.product.created'> {
  readonly eventType = 'event.product.created' as const;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
  ) {}

  async handle(payload: ProductCreatedPayload): Promise<void> {
    const { externalId, planId } = payload;

    if (!planId) return;

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(SubscriptionPlanGatewayProductEntity)
      .values({
        gateway: PaymentGatewayProvider.STRIPE,
        externalProductId: externalId,
        subscriptionPlanId: planId,
      })
      .orIgnore()
      .execute();

    const draftOffers =
      await this.subscriptionOfferRepository.findDraftOffersByPlanId(planId);

    if (draftOffers.length > 0) {
      const jobsToCreate = draftOffers.map((offer) => ({
        name: 'command.syncOffer' as const,
        data: {
          id: offer.id,
          price: offer.price,
          durationMonths: offer.durationMonths,
          subscriptionPlanId: planId,
          idempotencyKey: `sync-offer-${offer.id}-${planId}`,
        },
      }));

      await this.paymentQueueService.dispatchCommandsBulk(jobsToCreate);
    }
  }
}
