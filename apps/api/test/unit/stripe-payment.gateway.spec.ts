import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { StripePaymentGateway } from '../../src/modules/payment/gateways/stripe-payment.gateway';
import { STRIPE_CLIENT } from '../../src/modules/payment/payment.tokens';
import { PaymentGatewayProvider } from '@app/payment';

describe('StripePaymentGateway', () => {
  let gateway: StripePaymentGateway;

  const stripeMock = {
    products: {
      create: jest.fn(),
    },
    prices: {
      create: jest.fn(),
    },
    customers: {
      create: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
        PAYMENT_SUCCESS_URL: 'https://example.com/success',
        PAYMENT_CANCEL_URL: 'https://example.com/cancel',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripePaymentGateway,
        { provide: STRIPE_CLIENT, useValue: stripeMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    gateway = module.get<StripePaymentGateway>(StripePaymentGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should have STRIPE as gateway provider', () => {
    expect(gateway.gateway).toBe(PaymentGatewayProvider.STRIPE);
  });

  describe('createPrice', () => {
    const createPriceRequest = {
      id: 'offer-uuid',
      planName: 'Premium Plan',
      amount: 19.99,
      durationMonths: 3,
      currency: 'USD',
    };

    it('should create product and price in Stripe', async () => {
      stripeMock.products.create.mockResolvedValue({ id: 'prod_123' });
      stripeMock.prices.create.mockResolvedValue({ id: 'price_456' });

      const result = await gateway.createPrice(createPriceRequest);

      expect(stripeMock.products.create).toHaveBeenCalledWith({
        name: createPriceRequest.planName,
        metadata: { offerId: createPriceRequest.id },
      });
      expect(stripeMock.prices.create).toHaveBeenCalledWith({
        product: 'prod_123',
        currency: 'USD',
        unit_amount: 1999,
        recurring: {
          interval: 'month',
          interval_count: 3,
        },
        metadata: { offerId: createPriceRequest.id },
      });
      expect(result).toEqual({ id: 'price_456' });
    });

    it('should convert amount to cents correctly', async () => {
      stripeMock.products.create.mockResolvedValue({ id: 'prod_123' });
      stripeMock.prices.create.mockResolvedValue({ id: 'price_789' });

      await gateway.createPrice({ ...createPriceRequest, amount: 9.99 });

      expect(stripeMock.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({ unit_amount: 999 }),
      );
    });
  });

  describe('createCustomer', () => {
    it('should create customer in Stripe', async () => {
      stripeMock.customers.create.mockResolvedValue({ id: 'cus_123' });

      const result = await gateway.createCustomer({
        email: 'user@example.com',
        userId: 'user-uuid',
      });

      expect(stripeMock.customers.create).toHaveBeenCalledWith({
        email: 'user@example.com',
        metadata: { userId: 'user-uuid' },
      });
      expect(result).toEqual({ id: 'cus_123' });
    });
  });

  describe('createCheckoutSession', () => {
    const checkoutRequest = {
      userId: 'user-uuid',
      email: 'user@example.com',
      externalCustomerId: 'cus_123',
      offerId: 'offer-uuid',
      externalPriceId: 'price_456',
    };

    it('should create checkout session in Stripe', async () => {
      stripeMock.checkout.sessions.create.mockResolvedValue({
        id: 'cs_789',
        url: 'https://checkout.stripe.com/pay/cs_789',
      });

      const result = await gateway.createCheckoutSession(checkoutRequest);

      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: 'cus_123',
        line_items: [{ price: 'price_456', quantity: 1 }],
        subscription_data: {
          metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
        },
        metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });
      expect(result).toEqual({
        sessionId: 'cs_789',
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_789',
      });
    });
  });

  describe('constructWebhookEvent', () => {
    const payload = Buffer.from('test');
    const signature = 'stripe-signature';

    it('should handle checkout.session.completed event', async () => {
      const stripeEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            invoice: 'inv_456',
            metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
          },
        },
      };
      stripeMock.webhooks.constructEvent.mockReturnValue(stripeEvent);

      const result = await gateway.constructWebhookEvent(payload, signature);

      expect(result).toEqual({
        type: 'checkout.completed',
        externalSessionId: 'cs_123',
        externalInvoiceId: 'inv_456',
        metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
      });
    });

    it('should handle checkout.session.expired event', async () => {
      const stripeEvent = {
        type: 'checkout.session.expired',
        data: {
          object: {
            id: 'cs_expired',
            invoice: null,
            metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
          },
        },
      };
      stripeMock.webhooks.constructEvent.mockReturnValue(stripeEvent);

      const result = await gateway.constructWebhookEvent(payload, signature);

      expect(result).toEqual({
        type: 'checkout.expired',
        externalSessionId: 'cs_expired',
        externalInvoiceId: null,
        metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
      });
    });

    it('should handle invoice.paid event', async () => {
      const paidAt = 1735689600;
      const periodEnd = 1738368000;
      const stripeEvent = {
        type: 'invoice.paid',
        data: {
          object: {
            id: 'inv_123',
            billing_reason: 'subscription_create',
            parent: { subscription_details: { subscription: 'sub_456' } },
            status_transitions: { paid_at: paidAt },
            amount_paid: 999,
            currency: 'usd',
            lines: {
              data: [
                {
                  period: { end: periodEnd },
                  metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
                },
              ],
            },
          },
        },
      };
      stripeMock.webhooks.constructEvent.mockReturnValue(stripeEvent);

      const result = await gateway.constructWebhookEvent(payload, signature);

      expect(result).toEqual({
        type: 'invoice.paid',
        billingReason: 'subscription_create',
        externalSessionId: null,
        externalSubscriptionId: 'sub_456',
        externalInvoiceId: 'inv_123',
        paidAt: new Date(paidAt * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
        amount: 999,
        currency: 'usd',
      });
    });

    it('should handle invoice.payment_failed event', async () => {
      const stripeEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_failed',
            billing_reason: 'subscription_cycle',
            parent: { subscription_details: { subscription: 'sub_789' } },
            amount_due: 1999,
            currency: 'eur',
            lines: {
              data: [
                {
                  metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
                },
              ],
            },
          },
        },
      };
      stripeMock.webhooks.constructEvent.mockReturnValue(stripeEvent);

      const result = await gateway.constructWebhookEvent(payload, signature);

      expect(result).toEqual({
        type: 'invoice.payment_failed',
        billingReason: 'subscription_cycle',
        externalSessionId: null,
        externalSubscriptionId: 'sub_789',
        externalInvoiceId: 'inv_failed',
        paidAt: null,
        currentPeriodEnd: null,
        metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
        amount: 1999,
        currency: 'eur',
      });
    });

    it('should throw BadRequestException for invalid signature', async () => {
      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        gateway.constructWebhookEvent(payload, signature),
      ).rejects.toThrow(BadRequestException);
      await expect(
        gateway.constructWebhookEvent(payload, signature),
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should throw BadRequestException for unhandled event type', async () => {
      const stripeEvent = {
        type: 'customer.created',
        data: { object: {} },
      };
      stripeMock.webhooks.constructEvent.mockReturnValue(stripeEvent);

      await expect(
        gateway.constructWebhookEvent(payload, signature),
      ).rejects.toThrow(BadRequestException);
      await expect(
        gateway.constructWebhookEvent(payload, signature),
      ).rejects.toThrow('Unhandled webhook event type: customer.created');
    });
  });
});
