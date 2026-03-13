import {
  GATEWAY_PRODUCT_REPOSITORY,
  type IGatewayProductRepository,
  PAYMENT_GATEWAY,
  UpdatePlanCommand,
  type PaymentGateway,
} from '@app/payment';
import {
  IPaymentCommandHandler,
  JobContext,
} from '../../interfaces/payment-command-handler.interface';
import { Inject } from '@nestjs/common';

export class UpdatePlanHandler implements IPaymentCommandHandler<'command.updatePlan'> {
  readonly commandType = 'command.updatePlan';

  constructor(
    @Inject(GATEWAY_PRODUCT_REPOSITORY)
    private readonly gatewayProductRepository: IGatewayProductRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(payload: UpdatePlanCommand, context: JobContext): Promise<void> {
    const { planId, updates } = payload;

    const productId =
      await this.gatewayProductRepository.findByPlanIdAndGateway(
        planId,
        this.paymentGateway.gateway,
      );

    if (!productId) {
      throw new Error('Product not found in gateway');
    }

    const idempotencyKey = `update-plan-${planId}-${context.jobId}`;

    await this.paymentGateway.updateProduct(
      productId,
      {
        name: updates.name,
        description: updates.description,
      },
      idempotencyKey,
    );
  }
}
