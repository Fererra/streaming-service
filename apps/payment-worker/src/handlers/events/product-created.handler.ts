import {
  ProductCreatedPayload,
  GATEWAY_PRODUCT_REPOSITORY,
  type IGatewayProductRepository,
  PaymentGatewayProvider,
  PAYMENT_QUEUE_SERVICE,
  type IPaymentQueueService,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { Inject } from '@nestjs/common';
import {
  type ISubscriptionOfferRepository,
  type ISubscriptionPlanRepository,
  SUBSCRIPTION_OFFER_REPOSITORY,
  SUBSCRIPTION_PLAN_REPOSITORY,
} from '@app/subscription';
import { PlanStatus } from '@app/subscription/enums/status.enum';

export class ProductCreatedHandler implements IPaymentEventHandler<'event.product.created'> {
  readonly eventType = 'event.product.created' as const;

  constructor(
    @Inject(GATEWAY_PRODUCT_REPOSITORY)
    private readonly gatewayProductRepository: IGatewayProductRepository,
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
  ) {}

  async handle(payload: ProductCreatedPayload): Promise<void> {
    const { externalId, planId } = payload;

    if (!planId) return;

    await this.gatewayProductRepository.createGatewayProduct({
      gateway: PaymentGatewayProvider.STRIPE,
      externalProductId: externalId,
      subscriptionPlanId: planId,
    });

    await this.subscriptionPlanRepository.updateStatus(
      planId,
      PlanStatus.ACTIVE,
    );

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
        },
      }));

      await this.paymentQueueService.dispatchCommandsBulk(jobsToCreate);
    }
  }
}
