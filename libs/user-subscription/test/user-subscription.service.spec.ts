import { UserSubscriptionService } from '../src/services/user-subscription.service';
import { DataSource, EntityManager } from 'typeorm';
import { UserSubscriptionEntity } from '../src/entities/user-subscription.entity';
import { SubscriptionStatus } from '../src/enums/subscription-status.enum';
import { PaymentEntity } from '@app/payment/entities/payment.entity';
import { PaymentGatewayProvider } from '@app/payment/enums/payment-gateway-provider.enum';
import { PaymentStatus } from '@app/payment/enums/payment-status.enum';
import { InvoicePaidPayload } from '@app/payment/interfaces/payment-events.interface';

describe('UserSubscriptionService', () => {
  let service: UserSubscriptionService;
  let dataSourceMock: jest.Mocked<DataSource>;
  let managerMock: jest.Mocked<EntityManager>;

  const basePayload: InvoicePaidPayload = {
    externalInvoiceId: 'inv_123',
    externalSubscriptionId: 'sub_456',
    billingReason: 'subscription_create',
    currentPeriodEnd: new Date('2026-03-26'),
    paidAt: new Date('2026-02-26'),
    amount: 999,
    currency: 'USD',
    metadata: {
      userId: 'user-uuid-123',
      offerId: 'offer-uuid-456',
    },
  };

  beforeEach(() => {
    managerMock = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    dataSourceMock = {
      transaction: jest.fn((callback) => callback(managerMock)),
    } as unknown as jest.Mocked<DataSource>;

    service = new UserSubscriptionService(dataSourceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processInvoicePaid', () => {
    describe('when billingReason is subscription_create', () => {
      const createPayload: InvoicePaidPayload = {
        ...basePayload,
        billingReason: 'subscription_create',
      };

      it('should create a new subscription', async () => {
        const newSubscription = { id: 'subscription-uuid' };
        managerMock.create.mockReturnValue(newSubscription as any);
        managerMock.save.mockResolvedValue(newSubscription as any);
        managerMock.update.mockResolvedValue({ affected: 1 } as any);

        await service.processInvoicePaid(createPayload);

        expect(managerMock.create).toHaveBeenCalledWith(
          UserSubscriptionEntity,
          {
            userId: createPayload.metadata.userId,
            subscriptionOfferId: createPayload.metadata.offerId,
            externalSubscriptionId: createPayload.externalSubscriptionId,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: createPayload.paidAt,
            currentPeriodEnd: createPayload.currentPeriodEnd,
          },
        );
        expect(managerMock.save).toHaveBeenCalledWith(newSubscription);
      });

      it('should update the payment record with subscription details', async () => {
        const newSubscription = { id: 'subscription-uuid' };
        managerMock.create.mockReturnValue(newSubscription as any);
        managerMock.save.mockResolvedValue(newSubscription as any);
        managerMock.update.mockResolvedValue({ affected: 1 } as any);

        await service.processInvoicePaid(createPayload);

        expect(managerMock.update).toHaveBeenCalledWith(
          PaymentEntity,
          { externalInvoiceId: createPayload.externalInvoiceId },
          {
            userSubscriptionId: newSubscription.id,
            billingReason: createPayload.billingReason,
            status: PaymentStatus.COMPLETED,
            paidAt: createPayload.paidAt,
          },
        );
      });

      it('should throw an error when payment record is not found', async () => {
        const newSubscription = { id: 'subscription-uuid' };
        managerMock.create.mockReturnValue(newSubscription as any);
        managerMock.save.mockResolvedValue(newSubscription as any);
        managerMock.update.mockResolvedValue({ affected: 0 } as any);

        await expect(service.processInvoicePaid(createPayload)).rejects.toThrow(
          `Payment for invoice ${createPayload.externalInvoiceId} not found yet. Webhook might be too early.`,
        );
      });
    });

    describe('when billingReason is subscription_cycle (renewal)', () => {
      const renewalPayload: InvoicePaidPayload = {
        ...basePayload,
        billingReason: 'subscription_cycle',
      };

      it('should find the existing subscription', async () => {
        const existingSubscription = { id: 'existing-subscription-uuid' };
        managerMock.findOne.mockResolvedValue(existingSubscription as any);
        managerMock.update.mockResolvedValue({ affected: 1 } as any);
        managerMock.create.mockReturnValue({} as any);
        managerMock.save.mockResolvedValue({} as any);

        await service.processInvoicePaid(renewalPayload);

        expect(managerMock.findOne).toHaveBeenCalledWith(
          UserSubscriptionEntity,
          {
            select: ['id'],
            where: {
              externalSubscriptionId: renewalPayload.externalSubscriptionId,
            },
          },
        );
      });

      it('should update the subscription with new period end date', async () => {
        const existingSubscription = { id: 'existing-subscription-uuid' };
        managerMock.findOne.mockResolvedValue(existingSubscription as any);
        managerMock.update.mockResolvedValue({ affected: 1 } as any);
        managerMock.create.mockReturnValue({} as any);
        managerMock.save.mockResolvedValue({} as any);

        await service.processInvoicePaid(renewalPayload);

        expect(managerMock.update).toHaveBeenCalledWith(
          UserSubscriptionEntity,
          { id: existingSubscription.id },
          {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: renewalPayload.currentPeriodEnd,
          },
        );
      });

      it('should create a new payment record for the renewal', async () => {
        const existingSubscription = { id: 'existing-subscription-uuid' };
        const newPayment = { id: 'new-payment-uuid' };
        managerMock.findOne.mockResolvedValue(existingSubscription as any);
        managerMock.update.mockResolvedValue({ affected: 1 } as any);
        managerMock.create.mockReturnValue(newPayment as any);
        managerMock.save.mockResolvedValue(newPayment as any);

        await service.processInvoicePaid(renewalPayload);

        expect(managerMock.create).toHaveBeenCalledWith(PaymentEntity, {
          userId: renewalPayload.metadata?.userId,
          userSubscriptionId: existingSubscription.id,
          subscriptionOfferId: renewalPayload.metadata?.offerId,
          externalInvoiceId: renewalPayload.externalInvoiceId,
          billingReason: renewalPayload.billingReason,
          status: PaymentStatus.COMPLETED,
          amount: renewalPayload.amount,
          currency: renewalPayload.currency,
          gateway: PaymentGatewayProvider.STRIPE,
          metadata: renewalPayload.metadata,
          paidAt: renewalPayload.paidAt,
        });
        expect(managerMock.save).toHaveBeenCalledWith(newPayment);
      });

      it('should throw an error when subscription is not found', async () => {
        managerMock.findOne.mockResolvedValue(null);

        await expect(
          service.processInvoicePaid(renewalPayload),
        ).rejects.toThrow(
          `Subscription ${renewalPayload.externalSubscriptionId} not found for renewal`,
        );
      });
    });
  });
});
