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
      });

      if (!offer) return;

      const pendingOffersCount = await manager.count(SubscriptionOfferEntity, {
        where: {
          subscriptionPlan: { id: offer.subscriptionPlan.id },
          status: OfferStatus.DRAFT,
        },
      });

      if (pendingOffersCount === 0) {
        await manager.update(
          SubscriptionPlanEntity,
          { id: offer.subscriptionPlan.id },
          { status: PlanStatus.ACTIVE },
        );
      }
    });
  }
}
