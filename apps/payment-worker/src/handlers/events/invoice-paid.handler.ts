import { Injectable } from '@nestjs/common';
import {
  InvoicePaidPayload,
  PaymentEntity,
  PaymentGatewayProvider,
  PaymentStatus,
} from '@app/payment';
import { IPaymentEventHandler } from '../../interfaces/payment-event-handler.interface';
import { DataSource, EntityManager } from 'typeorm';
import { UserSubscriptionStatus } from '@app/shared';
import { UserSubscriptionEntity } from '@app/subscription';

@Injectable()
export class InvoicePaidHandler implements IPaymentEventHandler<'event.invoice.paid'> {
  readonly eventType = 'event.invoice.paid' as const;

  constructor(private readonly dataSource: DataSource) {}

  async handle(payload: InvoicePaidPayload): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      if (payload.billingReason === 'subscription_create') {
        return this.handleSubscriptionCreate(manager, payload);
      }

      return this.handleSubscriptionRenewal(manager, payload);
    });
  }

  private async handleSubscriptionCreate(
    manager: EntityManager,
    payload: InvoicePaidPayload,
  ) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(UserSubscriptionEntity)
      .values({
        userId: payload.metadata.userId,
        subscriptionOfferId: payload.metadata.offerId,
        externalSubscriptionId: payload.externalSubscriptionId,
        status: UserSubscriptionStatus.ACTIVE,
        currentPeriodStart: payload.paidAt as Date,
        currentPeriodEnd: payload.currentPeriodEnd as Date,
      })
      .orIgnore()
      .execute();

    const subscription = await manager.findOne(UserSubscriptionEntity, {
      select: ['id'],
      where: { externalSubscriptionId: payload.externalSubscriptionId },
    });

    if (!subscription) {
      throw new Error(
        `Subscription for ${payload.externalSubscriptionId} not found after upsert`,
      );
    }

    const initialPaymentId = payload.metadata.initialPaymentId;

    if (!initialPaymentId) {
      console.warn(
        `Subscription created from external source (no initialPaymentId). Invoice: ${payload.externalInvoiceId}`,
      );
      return;
    }

    const updatePaymentResult = await manager.update(
      PaymentEntity,
      { id: initialPaymentId },
      {
        userSubscriptionId: subscription.id,
        externalInvoiceId: payload.externalInvoiceId,
        billingReason: payload.billingReason,
        status: PaymentStatus.COMPLETED,
        paidAt: payload.paidAt,
      },
    );

    if (updatePaymentResult.affected === 0) {
      throw new Error(
        `Payment for invoice ${payload.externalInvoiceId} not found yet. Webhook might be too early.`,
      );
    }
  }

  private async handleSubscriptionRenewal(
    manager: EntityManager,
    payload: InvoicePaidPayload,
  ) {
    const existingSubscription = await manager.findOne(UserSubscriptionEntity, {
      select: ['id'],
      where: { externalSubscriptionId: payload.externalSubscriptionId },
    });

    if (!existingSubscription) {
      throw new Error(
        `Subscription ${payload.externalSubscriptionId} not found for renewal`,
      );
    }

    await manager.update(
      UserSubscriptionEntity,
      { id: existingSubscription.id },
      {
        status: UserSubscriptionStatus.ACTIVE,
        currentPeriodEnd: payload.currentPeriodEnd as Date,
      },
    );

    await manager
      .createQueryBuilder()
      .insert()
      .into(PaymentEntity)
      .values({
        userId: payload.metadata?.userId,
        userSubscriptionId: existingSubscription.id,
        subscriptionOfferId: payload.metadata?.offerId,
        externalInvoiceId: payload.externalInvoiceId,
        billingReason: payload.billingReason,
        status: PaymentStatus.COMPLETED,
        amount: payload.amount,
        currency: payload.currency,
        gateway: PaymentGatewayProvider.STRIPE,
        metadata: payload.metadata,
        paidAt: payload.paidAt,
      })
      .orIgnore()
      .execute();
  }
}
