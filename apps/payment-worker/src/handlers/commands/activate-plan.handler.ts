import {
  BasePlanCommand,
  GATEWAY_PRODUCT_REPOSITORY,
  type IGatewayProductRepository,
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '@app/payment';
import { IPaymentCommandHandler } from '../../interfaces/payment-command-handler.interface';
import { Inject } from '@nestjs/common';

export class ActivatePlanHandler implements IPaymentCommandHandler<'command.activatePlan'> {
  readonly commandType = 'command.activatePlan';

  constructor(
    @Inject(GATEWAY_PRODUCT_REPOSITORY)
    private readonly gatewayProductRepository: IGatewayProductRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(payload: BasePlanCommand): Promise<void> {
    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        payload.planId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new Error('Product not found in gateway');
    }

    await this.paymentGateway.activateProduct(
      productId,
      payload.idempotencyKey,
    );
  }
}
