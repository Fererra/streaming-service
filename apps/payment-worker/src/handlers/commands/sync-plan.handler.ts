import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
  type SyncPlanCommand,
} from '@app/payment';
import { IPaymentCommandHandler } from '../../interfaces/payment-command-handler.interface';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class SyncPlanHandler implements IPaymentCommandHandler<'command.syncPlan'> {
  readonly commandType = 'command.syncPlan';

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(payload: SyncPlanCommand): Promise<void> {
    await this.paymentGateway.createProduct(
      {
        id: payload.id,
        name: payload.name,
        description: payload.description,
      },
      payload.idempotencyKey,
    );
  }
}
