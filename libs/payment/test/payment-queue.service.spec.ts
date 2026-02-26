import { PaymentQueueService } from '../src/services/payment-queue.service';
import { Queue } from 'bullmq';
import {
  CheckoutCompletedPayload,
  InvoicePaidPayload,
} from '../src/interfaces/payment-events.interface';

describe('PaymentQueueService', () => {
  let service: PaymentQueueService;
  let queueMock: jest.Mocked<Queue>;

  beforeEach(() => {
    queueMock = {
      add: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Queue>;

    service = new PaymentQueueService(queueMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('dispatchEvent', () => {
    it('should add checkout.completed event to the queue with correct options', async () => {
      const payload: CheckoutCompletedPayload = {
        externalSessionId: 'cs_123',
        externalInvoiceId: 'inv_456',
        metadata: {
          userId: 'user-uuid',
          offerId: 'offer-uuid',
        },
      };

      await service.dispatchEvent('checkout.completed', payload);

      expect(queueMock.add).toHaveBeenCalledWith(
        'checkout.completed',
        payload,
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );
    });

    it('should add invoice.paid event to the queue with correct options', async () => {
      const payload: InvoicePaidPayload = {
        externalInvoiceId: 'inv_123',
        externalSubscriptionId: 'sub_456',
        billingReason: 'subscription_create',
        currentPeriodEnd: new Date('2026-03-26'),
        paidAt: new Date('2026-02-26'),
        amount: 9.99,
        currency: 'USD',
        metadata: {
          userId: 'user-uuid',
          offerId: 'offer-uuid',
        },
      };

      await service.dispatchEvent('invoice.paid', payload);

      expect(queueMock.add).toHaveBeenCalledWith('invoice.paid', payload, {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      });
    });

    it('should add checkout.expired event to the queue', async () => {
      const payload: CheckoutCompletedPayload = {
        externalSessionId: 'cs_expired',
        externalInvoiceId: null,
        metadata: {
          userId: 'user-uuid',
          offerId: 'offer-uuid',
        },
      };

      await service.dispatchEvent('checkout.expired', payload);

      expect(queueMock.add).toHaveBeenCalledWith('checkout.expired', payload, {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      });
    });

    it('should add invoice.payment_failed event to the queue', async () => {
      const payload: InvoicePaidPayload = {
        externalInvoiceId: 'inv_failed',
        externalSubscriptionId: 'sub_789',
        billingReason: 'subscription_cycle',
        currentPeriodEnd: null,
        paidAt: null,
        amount: 19.99,
        currency: 'EUR',
        metadata: {
          userId: 'user-uuid',
          offerId: 'offer-uuid',
        },
      };

      await service.dispatchEvent('invoice.payment_failed', payload);

      expect(queueMock.add).toHaveBeenCalledWith(
        'invoice.payment_failed',
        payload,
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );
    });

    it('should configure exponential backoff with 5 retry attempts', async () => {
      const payload: CheckoutCompletedPayload = {
        externalSessionId: 'cs_test',
        externalInvoiceId: 'inv_test',
        metadata: {
          userId: 'user-uuid',
          offerId: 'offer-uuid',
        },
      };

      await service.dispatchEvent('checkout.completed', payload);

      const addCall = queueMock.add.mock.calls[0];
      const options = addCall[2];

      expect(options).toEqual({
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      });
    });
  });
});
