import {
  BaseOfferCommand,
  GATEWAY_PRICE_REPOSITORY,
  type IGatewayPriceRepository,
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
import { CancellationInitiator } from '@app/shared';

export class DeactivateOfferHandler implements IPaymentCommandHandler<'command.deactivateOffer'> {
  readonly commandType = 'command.deactivateOffer';

  constructor(
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
    @Inject(GATEWAY_PRICE_REPOSITORY)
    private readonly gatewayPriceRepository: IGatewayPriceRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(payload: BaseOfferCommand, context: JobContext): Promise<void> {
    const gatewayPrice =
      await this.gatewayPriceRepository.findByOfferIdAndGateway(
        payload.offerId,
        this.paymentGateway.gateway,
      );

    if (!gatewayPrice) {
      throw new Error('Gateway price not found for offer');
    }

    const priceIdempotencyKey = `deactivate-price-${gatewayPrice.externalPriceId}-${context.jobId}`;

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
      data: { subscriptionId: subId, initiator: CancellationInitiator.ADMIN },
    }));

    if (jobsToCreate.length > 0) {
      await this.paymentQueueService.dispatchCommandsBulk(jobsToCreate);
    }
  }
}
