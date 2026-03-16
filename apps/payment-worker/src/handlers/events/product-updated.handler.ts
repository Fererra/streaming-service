import { ProductUpdatedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { Inject, Injectable } from '@nestjs/common';
import {
  type ISubscriptionPlanRepository,
  PlanStatus,
  SUBSCRIPTION_PLAN_REPOSITORY,
} from '@app/subscription';

@Injectable()
export class ProductUpdatedHandler implements IPaymentEventHandler<'event.product.updated'> {
  readonly eventType = 'event.product.updated' as const;

  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
  ) {}

  async handle(payload: ProductUpdatedPayload): Promise<void> {
    const { planId, isActive } = payload;

    if (!planId) return;

    const newStatus = isActive ? PlanStatus.ACTIVE : PlanStatus.DEACTIVATED;
    await this.subscriptionPlanRepository.updateStatus(planId, newStatus);
  }
}
