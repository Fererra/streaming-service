import {
  PaymentGatewayProvider,
  PriceCreatedPayload,
  SubscriptionOfferGatewayPriceEntity,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import {
  OfferStatus,
  PlanStatus,
  SubscriptionOfferEntity,
  SubscriptionPlanEntity,
} from '@app/subscription';
import { DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PriceCreatedHandler implements IPaymentEventHandler<'event.price.created'> {
  readonly eventType = 'event.price.created' as const;

  constructor(private readonly dataSource: DataSource) {}

  async handle(payload: PriceCreatedPayload): Promise<void> {
    const { externalId, offerId } = payload;

    if (!offerId) return;

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(SubscriptionOfferGatewayPriceEntity)
        .values({
          gateway: PaymentGatewayProvider.STRIPE,
          externalPriceId: externalId,
          subscriptionOfferId: offerId,
        })
        .orIgnore()
        .execute();

      const result = await manager.update(
        SubscriptionOfferEntity,
        { id: offerId },
        { status: OfferStatus.ACTIVE },
      );

      if (result.affected === 0) {
        throw new Error(`Failed to activate offer with ID: ${offerId}`);
      }

      const offer = await manager.findOne(SubscriptionOfferEntity, {
        where: { id: offerId },
        relations: ['subscriptionPlan'],
        select: { id: true, subscriptionPlan: { id: true, status: true } },
      });

      if (!offer || offer.subscriptionPlan.status !== PlanStatus.DRAFT) return;

      await manager
        .createQueryBuilder()
        .update(SubscriptionPlanEntity)
        .set({ status: PlanStatus.ACTIVE })
        .where('id = :planId', { planId: offer.subscriptionPlan.id })
        .andWhere('status = :status', { status: PlanStatus.DRAFT })
        .andWhere(
          `NOT EXISTS (
            SELECT 1 FROM subscription_offers o
            WHERE o.subscription_plan_id = :planId
            AND o.status = :draftStatus
          )`,
          { draftStatus: OfferStatus.DRAFT },
        )
        .execute();
    });
  }
}
