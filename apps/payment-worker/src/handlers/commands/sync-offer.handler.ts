import {
  GATEWAY_PRODUCT_REPOSITORY,
  type IGatewayProductRepository,
  PAYMENT_GATEWAY,
  SyncOfferCommand,
  type PaymentGateway,
} from '@app/payment';
import { IPaymentCommandHandler } from '../../interfaces/payment-command-handler.interface';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class SyncOfferHandler implements IPaymentCommandHandler<'command.syncOffer'> {
  readonly commandType = 'command.syncOffer';

  constructor(
    @Inject(GATEWAY_PRODUCT_REPOSITORY)
    private readonly gatewayProductRepository: IGatewayProductRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(payload: SyncOfferCommand): Promise<void> {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        payload.subscriptionPlanId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new Error('Plan is not synced to gateway');
    }

    await this.paymentGateway.createPrice(
      {
        id: payload.id,
        amount: payload.price,
        durationMonths: payload.durationMonths,
      },
      productId,
      payload.idempotencyKey,
    );
  }
}
