import { Test } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { PaymentService } from '../../src/modules/payment/payment.service';
import {
  PAYMENT_GATEWAY,
  STRIPE_CLIENT,
} from '../../src/modules/payment/payment.tokens';
import { StripePaymentGateway } from '../../src/modules/payment/gateways/stripe-payment.gateway';
import { DatabaseModule } from '../../src/database/database.module';
import { UsersService } from '../../src/modules/users/services/users.service';
import { SubscriptionPlanEntity } from '../../src/database/entities/subscription-plan.entity';
import { SubscriptionOfferEntity } from '../../src/database/entities/subscription-offer.entity';
import { SubscriptionOfferGatewayPriceEntity } from '../../src/database/entities/gateway-price.entity';
import { UserGatewayCustomerEntity } from '../../src/database/entities/gateway-customer.entity';
import { UserEntity } from '../../src/database/entities/user.entity';
import { CountryEntity } from '../../src/database/entities/country.entity';
import { UserRole } from '../../src/modules/users/user-role.enum';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentPersistenceModule } from '@app/payment/modules/payment-persistence.module';
import {
  PAYMENT_QUEUE_SERVICE,
  PaymentGatewayProvider,
  PaymentStatus,
} from '@app/payment';
import { PaymentEntity } from '@app/payment/entities/payment.entity';
import { OBJECT_STORAGE } from '../../src/modules/storage/storage.token';

describe('PaymentService (integration)', () => {
  let app: INestApplication;
  let paymentService: PaymentService;
  let dataSource: DataSource;

  let testUser: UserEntity;
  let testCountry: CountryEntity;
  let testPlan: SubscriptionPlanEntity;
  let testOffer: SubscriptionOfferEntity;
  let testGatewayPrice: SubscriptionOfferGatewayPriceEntity;

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

  const paymentQueueServiceMock = {
    dispatchEvent: jest.fn(),
  };

  const storageMock = {
    generateSignedUploadUrl: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  beforeAll(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              STRIPE_WEBHOOK_SECRET: 'whsec_test',
              PAYMENT_SUCCESS_URL: 'https://example.com/success',
              PAYMENT_CANCEL_URL: 'https://example.com/cancel',
            }),
          ],
        }),
        DatabaseModule,
        PaymentPersistenceModule,
      ],
      providers: [
        PaymentService,
        UsersService,
        ConfigService,
        { provide: STRIPE_CLIENT, useValue: stripeMock },
        { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
        { provide: PAYMENT_QUEUE_SERVICE, useValue: paymentQueueServiceMock },
        { provide: OBJECT_STORAGE, useValue: storageMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    paymentService = app.get(PaymentService);
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    testCountry = dataSource.getRepository(CountryEntity).create({
      code: 'US',
      countryName: 'United States',
    });
    await dataSource.getRepository(CountryEntity).save(testCountry);

    testUser = dataSource.getRepository(UserEntity).create({
      firstName: 'Test',
      lastName: 'User',
      email: `test-${Date.now()}@example.com`,
      password: 'hashedpassword',
      dateOfBirth: '1990-01-01',
      role: UserRole.USER,
      country: testCountry,
    });
    await dataSource.getRepository(UserEntity).save(testUser);

    testPlan = dataSource.getRepository(SubscriptionPlanEntity).create({
      name: `Test Plan ${Date.now()}`,
      description: 'Test plan description',
    });
    await dataSource.getRepository(SubscriptionPlanEntity).save(testPlan);

    testOffer = dataSource.getRepository(SubscriptionOfferEntity).create({
      subscriptionPlan: testPlan,
      durationMonths: 1,
      price: 999,
    });
    await dataSource.getRepository(SubscriptionOfferEntity).save(testOffer);

    testGatewayPrice = dataSource
      .getRepository(SubscriptionOfferGatewayPriceEntity)
      .create({
        gateway: PaymentGatewayProvider.STRIPE,
        externalPriceId: 'price_test_123',
        offer: testOffer,
      });
    await dataSource
      .getRepository(SubscriptionOfferGatewayPriceEntity)
      .save(testGatewayPrice);
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE payments RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE user_gateway_customers RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE subscription_offer_gateway_prices RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE subscription_offers RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE subscription_plans RESTART IDENTITY CASCADE',
    );
    await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session and payment record for existing customer', async () => {
      const existingCustomer = dataSource
        .getRepository(UserGatewayCustomerEntity)
        .create({
          user: testUser,
          gateway: PaymentGatewayProvider.STRIPE,
          externalCustomerId: 'cus_existing_123',
        });
      await dataSource
        .getRepository(UserGatewayCustomerEntity)
        .save(existingCustomer);

      stripeMock.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session',
        url: 'https://checkout.stripe.com/pay/cs_test_session',
      });

      const result = await paymentService.createCheckoutSession(testUser.id, {
        offerId: testOffer.id,
        currency: 'USD',
      });

      expect(result).toEqual({
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_session',
      });

      const payment = await dataSource.getRepository(PaymentEntity).findOne({
        where: { userId: testUser.id },
      });

      expect(payment).toBeDefined();
      expect(payment!.userId).toBe(testUser.id);
      expect(payment!.subscriptionOfferId).toBe(testOffer.id);
      expect(payment!.externalSessionId).toBe('cs_test_session');
      expect(payment!.status).toBe(PaymentStatus.PENDING);
      expect(payment!.currency).toBe('USD');
      expect(payment!.gateway).toBe(PaymentGatewayProvider.STRIPE);

      expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer: 'cus_existing_123',
        line_items: [{ price: 'price_test_123', quantity: 1 }],
        subscription_data: {
          metadata: { userId: testUser.id, offerId: testOffer.id },
        },
        metadata: { userId: testUser.id, offerId: testOffer.id },
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      expect(stripeMock.customers.create).not.toHaveBeenCalled();
    });

    it('should create new customer when not exists', async () => {
      stripeMock.customers.create.mockResolvedValue({ id: 'cus_new_456' });
      stripeMock.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_new_session',
        url: 'https://checkout.stripe.com/pay/cs_test_new_session',
      });

      const result = await paymentService.createCheckoutSession(testUser.id, {
        offerId: testOffer.id,
      });

      expect(result.checkoutUrl).toBe(
        'https://checkout.stripe.com/pay/cs_test_new_session',
      );

      expect(stripeMock.customers.create).toHaveBeenCalledWith({
        email: testUser.email,
        metadata: { userId: testUser.id },
      });

      const savedCustomer = await dataSource
        .getRepository(UserGatewayCustomerEntity)
        .findOne({
          where: { user: { id: testUser.id } },
        });

      expect(savedCustomer).toBeDefined();
      expect(savedCustomer!.externalCustomerId).toBe('cus_new_456');
      expect(savedCustomer!.gateway).toBe(PaymentGatewayProvider.STRIPE);
    });

    it('should throw NotFoundException when user not found', async () => {
      await expect(
        paymentService.createCheckoutSession(randomUUID(), {
          offerId: testOffer.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw NotFoundException when offer not found', async () => {
      await expect(
        paymentService.createCheckoutSession(testUser.id, {
          offerId: randomUUID(),
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should use default currency USD when not provided', async () => {
      stripeMock.customers.create.mockResolvedValue({ id: 'cus_default' });
      stripeMock.checkout.sessions.create.mockResolvedValue({
        id: 'cs_default',
        url: 'https://checkout.stripe.com/pay/cs_default',
      });

      await paymentService.createCheckoutSession(testUser.id, {
        offerId: testOffer.id,
      });

      const payment = await dataSource.getRepository(PaymentEntity).findOne({
        where: { userId: testUser.id },
      });

      expect(payment!.currency).toBe('USD');
    });
  });

  describe('syncOfferToGateway', () => {
    it('should create price in Stripe and save mapping', async () => {
      stripeMock.products.create.mockResolvedValue({ id: 'prod_new_123' });
      stripeMock.prices.create.mockResolvedValue({ id: 'price_new_456' });

      await dataSource.query(
        'TRUNCATE TABLE subscription_offer_gateway_prices RESTART IDENTITY CASCADE',
      );

      const offerWithPlan = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .findOne({
          where: { id: testOffer.id },
          relations: ['subscriptionPlan'],
        });

      await paymentService.syncOfferToGateway(offerWithPlan!);

      expect(stripeMock.products.create).toHaveBeenCalledWith({
        name: testPlan.name,
        metadata: { offerId: testOffer.id },
      });

      expect(stripeMock.prices.create).toHaveBeenCalledWith({
        product: 'prod_new_123',
        currency: 'USD',
        unit_amount: 999,
        recurring: { interval: 'month', interval_count: 1 },
        metadata: { offerId: testOffer.id },
      });

      const gatewayPrice = await dataSource
        .getRepository(SubscriptionOfferGatewayPriceEntity)
        .findOne({
          where: { offer: { id: testOffer.id } },
        });

      expect(gatewayPrice).toBeDefined();
      expect(gatewayPrice!.externalPriceId).toBe('price_new_456');
      expect(gatewayPrice!.gateway).toBe(PaymentGatewayProvider.STRIPE);
    });
  });

  describe('handleWebhookEvent', () => {
    it('should construct event and dispatch to queue', async () => {
      const payload = Buffer.from('test payload');
      const signature = 'test_signature';

      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_webhook_test',
            invoice: 'inv_123',
            metadata: { userId: testUser.id, offerId: testOffer.id },
          },
        },
      };

      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

      await paymentService.handleWebhookEvent(payload, signature);

      expect(stripeMock.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test',
      );

      expect(paymentQueueServiceMock.dispatchEvent).toHaveBeenCalledWith(
        'checkout.completed',
        {
          type: 'checkout.completed',
          externalSessionId: 'cs_webhook_test',
          externalInvoiceId: 'inv_123',
          metadata: { userId: testUser.id, offerId: testOffer.id },
        },
      );
    });

    it('should dispatch invoice.paid event correctly', async () => {
      const payload = Buffer.from('invoice payload');
      const signature = 'invoice_signature';

      const paidAt = 1735689600;
      const periodEnd = 1738368000;

      const mockEvent = {
        type: 'invoice.paid',
        data: {
          object: {
            id: 'inv_paid_123',
            billing_reason: 'subscription_create',
            parent: { subscription_details: { subscription: 'sub_456' } },
            status_transitions: { paid_at: paidAt },
            amount_paid: 999,
            currency: 'usd',
            lines: {
              data: [
                {
                  period: { end: periodEnd },
                  metadata: { userId: testUser.id, offerId: testOffer.id },
                },
              ],
            },
          },
        },
      };

      stripeMock.webhooks.constructEvent.mockReturnValue(mockEvent);

      await paymentService.handleWebhookEvent(payload, signature);

      expect(paymentQueueServiceMock.dispatchEvent).toHaveBeenCalledWith(
        'invoice.paid',
        expect.objectContaining({
          type: 'invoice.paid',
          externalInvoiceId: 'inv_paid_123',
          externalSubscriptionId: 'sub_456',
          billingReason: 'subscription_create',
          amount: 999,
          currency: 'usd',
        }),
      );
    });
  });
});
