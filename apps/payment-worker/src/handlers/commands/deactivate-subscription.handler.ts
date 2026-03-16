import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
  BaseSubscriptionCommand,
} from '@app/payment';
import { IPaymentCommandHandler } from '../../interfaces/payment-command-handler.interface';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class DeactivateSubscriptionHandler implements IPaymentCommandHandler<'command.deactivateSubscription'> {
  readonly commandType = 'command.deactivateSubscription';

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(payload: BaseSubscriptionCommand): Promise<void> {
    await this.paymentGateway.deactivateSubscription(
      payload.subscriptionId,
      payload.idempotencyKey,
      payload.initiator,
    );
  }
}
