import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
  type SyncPlanCommand,
} from '@app/payment';
import {
  IPaymentCommandHandler,
  JobContext,
} from '../../interfaces/payment-command-handler.interface';
import { Inject } from '@nestjs/common';

export class SyncPlanHandler implements IPaymentCommandHandler<'command.syncPlan'> {
  readonly commandType = 'command.syncPlan';

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

  async handle(payload: SyncPlanCommand, context: JobContext): Promise<void> {
    const idempotencyKey = `sync-plan-${payload.id}-${context.jobId}`;

    await this.paymentGateway.createProduct(
      {
        id: payload.id,
        name: payload.name,
        description: payload.description,
      },
      idempotencyKey,
    );
  }
}
