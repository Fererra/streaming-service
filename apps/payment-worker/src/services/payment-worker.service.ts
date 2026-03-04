import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
  GATEWAY_PRICE_REPOSITORY,
  PAYMENT_QUEUE_SERVICE,
  type IPaymentQueueService,
  GATEWAY_PRODUCT_REPOSITORY,
  SubscriptionPlan,
  SubscriptionOffer,
  type IGatewayPriceRepository,
  type IGatewayProductRepository,
} from '@app/payment';
import {
  type ISubscriptionOfferRepository,
  SUBSCRIPTION_OFFER_REPOSITORY,
} from '@app/subscription';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class PaymentWorkerService {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    @Inject(GATEWAY_PRICE_REPOSITORY)
    private readonly gatewayPriceRepository: IGatewayPriceRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
    @Inject(GATEWAY_PRODUCT_REPOSITORY)
    private readonly gatewayProductRepository: IGatewayProductRepository,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
  ) {}

  async createProductInGateway(plan: SubscriptionPlan, jobId: string) {
    const idempotencyKey = `sync-plan-${plan.id}-${jobId}`;

    await this.paymentGateway.createProduct(
      {
        id: plan.id,
        name: plan.name,
        description: plan.description,
      },
      idempotencyKey,
    );
  }

  async updateProductInGateway(
    planId: string,
    updateSubscriptionDto: Partial<SubscriptionPlan>,
    jobId: string,
  ) {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        planId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new Error('Product not found in gateway');
    }

    const idempotencyKey = `update-plan-${planId}-${jobId}`;

    await this.paymentGateway.updateProduct(
      productId,
      {
        name: updateSubscriptionDto.name,
        description: updateSubscriptionDto.description,
      },
      idempotencyKey,
    );
  }

  async syncOfferToGateway(offer: SubscriptionOffer, jobId: string) {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        offer.subscriptionPlanId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new Error('Plan is not synced to gateway');
    }

    const idempotencyKey = `sync-offer-${offer.id}-${jobId}`;

    await this.paymentGateway.createPrice(
      {
        id: offer.id,
        amount: offer.price,
        durationMonths: offer.durationMonths,
        currency: 'USD',
      },
      productId,
      idempotencyKey,
    );
  }

  async deactivateOfferInGateway(offerId: string, jobId: string) {
    const gatewayPrice =
      await this.gatewayPriceRepository.findByOfferIdAndGateway(
        offerId,
        this.paymentGateway.gateway,
      );

    if (!gatewayPrice) {
      throw new Error('Gateway price not found for offer');
    }

    const priceIdempotencyKey = `deactivate-price-${gatewayPrice.externalPriceId}-${jobId}`;

    await this.paymentGateway.deactivatePrice(
      gatewayPrice.externalPriceId,
      priceIdempotencyKey,
    );

    const activeSubscriptions =
      await this.paymentGateway.getActiveSubscriptions(
        gatewayPrice.externalPriceId,
      );

    const jobsToCreate = activeSubscriptions.map((subId) => ({
      name: 'command.deactivateSubscription' as const,
      data: { subscriptionId: subId },
    }));

    if (jobsToCreate.length > 0) {
      await this.paymentQueueService.dispatchCommandsBulk(jobsToCreate);
    }
  }

  async activateProductInGateway(planId: string, jobId: string) {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        planId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new Error('Product not found in gateway');
    }

    const idempotencyKey = `activate-plan-${planId}-${jobId}`;

    await this.paymentGateway.activateProduct(productId, idempotencyKey);
  }

  async deactivateProductInGateway(planId: string, jobId: string) {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        planId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new Error('Product not found in gateway');
    }

    const productIdempotencyKey = `deactivate-plan-${planId}-${jobId}`;

    await this.paymentGateway.deactivateProduct(
      productId,
      productIdempotencyKey,
    );

    const internalOffers =
      await this.subscriptionOfferRepository.findActiveOffersByPlanId(planId);

    const jobsToCreate = internalOffers.map((offer) => ({
      name: 'command.deactivateOffer' as const,
      data: { offerId: offer.id },
    }));

    if (jobsToCreate.length > 0) {
      await this.paymentQueueService.dispatchCommandsBulk(jobsToCreate);
    }
  }

  async deactivateSubscriptionInGateway(subscriptionId: string, jobId: string) {
    const idempotencyKey = `deactivate-subscription-${subscriptionId}-${jobId}`;

    await this.paymentGateway.deactivateSubscription(
      subscriptionId,
      idempotencyKey,
    );
  }
}
