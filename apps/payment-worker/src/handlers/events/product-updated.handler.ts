import { ProductUpdatedPayload } from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { Inject, Injectable } from '@nestjs/common';
import {
  type ISubscriptionPlanRepository,
  PlanStatus,
  SUBSCRIPTION_PLAN_REPOSITORY,
  SubscriptionPlanEntity,
} from '@app/subscription';

@Injectable()
export class ProductUpdatedHandler implements IPaymentEventHandler<'event.product.updated'> {
  readonly eventType = 'event.product.updated' as const;

  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
  ) {}

  async handle(payload: ProductUpdatedPayload): Promise<void> {
    const { planId, updates } = payload;

    if (!planId) return;

    const updateData: Partial<SubscriptionPlanEntity> = {
      ...(updates.name && { name: updates.name }),
      ...(updates.description && {
        description: updates.description,
      }),
      ...(updates.isActive && {
        status: updates.isActive ? PlanStatus.ACTIVE : PlanStatus.DEACTIVATED,
      }),
    };

    if (Object.keys(updateData).length === 0) return;

    const affected = await this.subscriptionPlanRepository.update(
      planId,
      updateData,
    );

    if (affected === 0) {
      console.warn(`Subscription plan ${planId} not found for update`);
    }
  }
}
