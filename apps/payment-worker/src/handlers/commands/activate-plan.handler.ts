import {
  BasePlanCommand,
  GATEWAY_PRODUCT_REPOSITORY,
  type IGatewayProductRepository,
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '@app/payment';
import {
  IPaymentCommandHandler,
  JobContext,
} from '../../interfaces/payment-command-handler.interface';
import { Inject } from '@nestjs/common';

export class ActivatePlanHandler implements IPaymentCommandHandler<'command.activatePlan'> {
  readonly commandType = 'command.activatePlan';

  constructor(
    @Inject(GATEWAY_PRODUCT_REPOSITORY)
    private readonly gatewayProductRepository: IGatewayProductRepository,
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

    const idempotencyKey = `activate-plan-${payload.planId}-${context.jobId}`;

    await this.paymentGateway.activateProduct(productId, idempotencyKey);
  }
}
