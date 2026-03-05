import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserSubscriptionEntity } from '../entities/user-subscription.entity';
import { UserSubscriptionStatus } from '../enums/user-subscription-status.enum';
import {
  InvoicePaidPayload,
  PaymentGatewayProvider,
  PaymentEntity,
  PaymentStatus,
  SubscriptionUpdatedPayload,
} from '@app/payment';
import { USER_SUBSCRIPTION_REPOSITORY } from '../constants/constant';
import type { IUserSubscriptionRepository } from '../interfaces/user-subscription-repository.interface';

@Injectable()
export class UserSubscriptionService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(USER_SUBSCRIPTION_REPOSITORY)
    private readonly userSubscriptionRepository: IUserSubscriptionRepository,
  ) {}

  async processInvoicePaid(payload: InvoicePaidPayload) {
    return this.dataSource.transaction(async (manager) => {
      if (payload.billingReason === 'subscription_create') {
        return this.handleSubscriptionCreate(manager, payload);
      }

      return this.handleSubscriptionRenewal(manager, payload);
    });
  }

  private async handleSubscriptionCreate(
    manager: DataSource['manager'],
    payload: InvoicePaidPayload,
  ) {
    const newSubscription = manager.create(UserSubscriptionEntity, {
      userId: payload.metadata.userId,
      subscriptionOfferId: payload.metadata.offerId,
      externalSubscriptionId: payload.externalSubscriptionId,
      status: UserSubscriptionStatus.ACTIVE,
      currentPeriodStart: payload.paidAt as Date,
      currentPeriodEnd: payload.currentPeriodEnd as Date,
    });

    await manager.save(newSubscription);

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
        userSubscriptionId: newSubscription.id,
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
    manager: DataSource['manager'],
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

    const newPayment = manager.create(PaymentEntity, {
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
    });

    await manager.save(newPayment);
  }

  async markSubscriptionAsCanceled(payload: SubscriptionUpdatedPayload) {
    const affected =
      await this.userSubscriptionRepository.updateByExternalSubscriptionId(
        payload.externalSubscriptionId,
        {
          cancellationReason: payload.cancellationReason,
          canceledAt: payload.canceledAt,
        },
      );

    if (affected === 0) {
      console.warn(
        `No subscription found with externalSubscriptionId ${payload.externalSubscriptionId} to mark as canceled.`,
      );
    }
  }
}
