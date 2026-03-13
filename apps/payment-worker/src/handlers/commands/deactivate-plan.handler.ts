import {
  BasePlanCommand,
  GATEWAY_PRODUCT_REPOSITORY,
  type IGatewayProductRepository,
  type IPaymentQueueService,
  PAYMENT_GATEWAY,
  PAYMENT_QUEUE_SERVICE,
  type PaymentGateway,
} from '@app/payment';
import {
  IPaymentCommandHandler,
  JobContext,
} from '../../interfaces/payment-command-handler.interface';
import { Inject } from '@nestjs/common';
import {
  type ISubscriptionOfferRepository,
  SUBSCRIPTION_OFFER_REPOSITORY,
} from '@app/subscription';

export class DeactivatePlanHandler implements IPaymentCommandHandler<'command.deactivatePlan'> {
  readonly commandType = 'command.deactivatePlan';

  constructor(
    @Inject(GATEWAY_PRODUCT_REPOSITORY)
    private readonly gatewayProductRepository: IGatewayProductRepository,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(payload: BasePlanCommand, context: JobContext): Promise<void> {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        payload.planId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new Error('Product not found in gateway');
    }

    const productIdempotencyKey = `deactivate-plan-${payload.planId}-${context.jobId}`;

    await this.paymentGateway.deactivateProduct(
      productId,
      productIdempotencyKey,
    );

    const internalOffers =
      await this.subscriptionOfferRepository.findActiveOffersByPlanId(
        payload.planId,
      );

    const jobsToCreate = internalOffers.map((offer) => ({
      name: 'command.deactivateOffer' as const,
      data: { offerId: offer.id },
    }));

    if (jobsToCreate.length > 0) {
      await this.paymentQueueService.dispatchCommandsBulk(jobsToCreate);
    }
  }
}
