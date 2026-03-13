import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
  BaseSubscriptionCommand,
} from '@app/payment';
import {
  IPaymentCommandHandler,
  JobContext,
} from '../../interfaces/payment-command-handler.interface';
import { Inject } from '@nestjs/common';

export class DeactivateSubscriptionHandler implements IPaymentCommandHandler<'command.deactivateSubscription'> {
  readonly commandType = 'command.deactivateSubscription';

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(
    payload: BaseSubscriptionCommand,
    context: JobContext,
  ): Promise<void> {
    const idempotencyKey = `deactivate-subscription-${payload.subscriptionId}-${context.jobId}`;

    await this.paymentGateway.deactivateSubscription(
      payload.subscriptionId,
      idempotencyKey,
      payload.initiator,
    );
  }
}
