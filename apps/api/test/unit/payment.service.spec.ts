import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentService } from '../../src/modules/payment/payment.service';
import { PAYMENT_GATEWAY } from '../../src/modules/payment/payment.tokens';
import {
  GATEWAY_CUSTOMER_REPOSITORY,
  GATEWAY_PRICE_REPOSITORY,
} from '../../src/database/repositories/tokens/repository.tokens';
import {
  PAYMENT_REPOSITORY,
  PAYMENT_QUEUE_SERVICE,
  PaymentStatus,
  PaymentGatewayProvider,
} from '@app/payment';
import { UsersService } from '../../src/modules/users/services/users.service';
import type { CreateCheckoutDto } from '../../src/modules/payment/dto/create-checkout.dto';

describe('PaymentService', () => {
  let service: PaymentService;

  const paymentGatewayMock = {
    gateway: PaymentGatewayProvider.STRIPE,
    createPrice: jest.fn(),
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
    constructWebhookEvent: jest.fn(),
  };

  const paymentRepositoryMock = {
    create: jest.fn(),
    findByExternalSessionId: jest.fn(),
    update: jest.fn(),
  };

  const gatewayPriceRepositoryMock = {
    createGatewayPrice: jest.fn(),
    findByOfferIdAndGateway: jest.fn(),
  };

  const gatewayCustomerRepositoryMock = {
    findByUserIdAndGateway: jest.fn(),
    save: jest.fn(),
  };

  const paymentQueueServiceMock = {
    dispatchEvent: jest.fn(),
  };

  const usersServiceMock = {
    findUserEmailById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PAYMENT_GATEWAY, useValue: paymentGatewayMock },
        { provide: PAYMENT_REPOSITORY, useValue: paymentRepositoryMock },
        {
          provide: GATEWAY_PRICE_REPOSITORY,
          useValue: gatewayPriceRepositoryMock,
        },
        {
          provide: GATEWAY_CUSTOMER_REPOSITORY,
          useValue: gatewayCustomerRepositoryMock,
        },
        { provide: PAYMENT_QUEUE_SERVICE, useValue: paymentQueueServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncOfferToGateway', () => {
    const mockOffer = {
      id: 'offer-uuid',
      price: 999,
      durationMonths: 1,
      subscriptionPlan: { name: 'Basic Plan' },
    };

    it('should create price in gateway and save mapping', async () => {
      const externalPriceId = 'price_stripe_123';
      paymentGatewayMock.createPrice.mockResolvedValue({ id: externalPriceId });

      await service.syncOfferToGateway(mockOffer as any);

      expect(paymentGatewayMock.createPrice).toHaveBeenCalledWith({
        id: mockOffer.id,
        planName: mockOffer.subscriptionPlan.name,
        amount: mockOffer.price,
        durationMonths: mockOffer.durationMonths,
        currency: 'USD',
      });
      expect(
        gatewayPriceRepositoryMock.createGatewayPrice,
      ).toHaveBeenCalledWith(
        PaymentGatewayProvider.STRIPE,
        externalPriceId,
        mockOffer.id,
      );
    });
  });

  describe('createCheckoutSession', () => {
    const userId = 'user-uuid';
    const dto: CreateCheckoutDto = {
      offerId: 'offer-uuid',
      currency: 'USD',
    };

    const userEmail = 'user@example.com';
    const externalCustomerId = 'cus_stripe_123';
    const externalPriceId = 'price_stripe_456';
    const sessionId = 'cs_stripe_789';
    const checkoutUrl = 'https://checkout.stripe.com/pay/cs_stripe_789';

    const gatewayOffer = {
      externalPriceId,
      offer: { price: 9.99 },
    };

    it('should create checkout session and payment record', async () => {
      usersServiceMock.findUserEmailById.mockResolvedValue(userEmail);
      gatewayPriceRepositoryMock.findByOfferIdAndGateway.mockResolvedValue(
        gatewayOffer,
      );
      gatewayCustomerRepositoryMock.findByUserIdAndGateway.mockResolvedValue({
        externalCustomerId,
      });
      paymentGatewayMock.createCheckoutSession.mockResolvedValue({
        sessionId,
        checkoutUrl,
      });

      const result = await service.createCheckoutSession(userId, dto);

      expect(result).toEqual({ checkoutUrl });
      expect(paymentGatewayMock.createCheckoutSession).toHaveBeenCalledWith({
        userId,
        email: userEmail,
        externalCustomerId,
        offerId: dto.offerId,
        externalPriceId,
      });
      expect(paymentRepositoryMock.create).toHaveBeenCalledWith({
        userId,
        subscriptionOfferId: dto.offerId,
        externalSessionId: sessionId,
        status: PaymentStatus.PENDING,
        amount: 999,
        currency: 'USD',
        gateway: PaymentGatewayProvider.STRIPE,
      });
    });

    it('should throw NotFoundException when user email not found', async () => {
      usersServiceMock.findUserEmailById.mockResolvedValue(null);

      await expect(service.createCheckoutSession(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createCheckoutSession(userId, dto)).rejects.toThrow(
        'User email not found',
      );
    });

    it('should throw NotFoundException when offer not found in gateway', async () => {
      usersServiceMock.findUserEmailById.mockResolvedValue(userEmail);
      gatewayPriceRepositoryMock.findByOfferIdAndGateway.mockResolvedValue(
        null,
      );

      await expect(service.createCheckoutSession(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createCheckoutSession(userId, dto)).rejects.toThrow(
        'Subscription offer not found',
      );
    });

    it('should create new customer when not exists in gateway', async () => {
      usersServiceMock.findUserEmailById.mockResolvedValue(userEmail);
      gatewayPriceRepositoryMock.findByOfferIdAndGateway.mockResolvedValue(
        gatewayOffer,
      );
      gatewayCustomerRepositoryMock.findByUserIdAndGateway.mockResolvedValue(
        null,
      );
      paymentGatewayMock.createCustomer.mockResolvedValue({
        id: externalCustomerId,
      });
      paymentGatewayMock.createCheckoutSession.mockResolvedValue({
        sessionId,
        checkoutUrl,
      });

      await service.createCheckoutSession(userId, dto);

      expect(paymentGatewayMock.createCustomer).toHaveBeenCalledWith({
        email: userEmail,
        userId,
      });
      expect(gatewayCustomerRepositoryMock.save).toHaveBeenCalledWith({
        user: { id: userId },
        gateway: PaymentGatewayProvider.STRIPE,
        externalCustomerId,
      });
    });

    it('should use existing customer when already exists', async () => {
      usersServiceMock.findUserEmailById.mockResolvedValue(userEmail);
      gatewayPriceRepositoryMock.findByOfferIdAndGateway.mockResolvedValue(
        gatewayOffer,
      );
      gatewayCustomerRepositoryMock.findByUserIdAndGateway.mockResolvedValue({
        externalCustomerId,
      });
      paymentGatewayMock.createCheckoutSession.mockResolvedValue({
        sessionId,
        checkoutUrl,
      });

      await service.createCheckoutSession(userId, dto);

      expect(paymentGatewayMock.createCustomer).not.toHaveBeenCalled();
      expect(gatewayCustomerRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('should use default currency USD when not provided', async () => {
      const dtoWithoutCurrency: CreateCheckoutDto = { offerId: 'offer-uuid' };
      usersServiceMock.findUserEmailById.mockResolvedValue(userEmail);
      gatewayPriceRepositoryMock.findByOfferIdAndGateway.mockResolvedValue(
        gatewayOffer,
      );
      gatewayCustomerRepositoryMock.findByUserIdAndGateway.mockResolvedValue({
        externalCustomerId,
      });
      paymentGatewayMock.createCheckoutSession.mockResolvedValue({
        sessionId,
        checkoutUrl,
      });

      await service.createCheckoutSession(userId, dtoWithoutCurrency);

      expect(paymentRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD' }),
      );
    });
  });

  describe('handleWebhookEvent', () => {
    const payload = Buffer.from('test');
    const signature = 'stripe-signature';

    it('should construct webhook event and dispatch to queue', async () => {
      const mockEvent = {
        type: 'checkout.completed',
        externalSessionId: 'cs_123',
        metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
      };
      paymentGatewayMock.constructWebhookEvent.mockResolvedValue(mockEvent);

      await service.handleWebhookEvent(payload, signature);

      expect(paymentGatewayMock.constructWebhookEvent).toHaveBeenCalledWith(
        payload,
        signature,
      );
      expect(paymentQueueServiceMock.dispatchEvent).toHaveBeenCalledWith(
        'checkout.completed',
        mockEvent,
      );
    });

    it('should dispatch invoice.paid event to queue', async () => {
      const mockEvent = {
        type: 'invoice.paid',
        externalInvoiceId: 'inv_123',
        externalSubscriptionId: 'sub_456',
        metadata: { userId: 'user-uuid', offerId: 'offer-uuid' },
      };
      paymentGatewayMock.constructWebhookEvent.mockResolvedValue(mockEvent);

      await service.handleWebhookEvent(payload, signature);

      expect(paymentQueueServiceMock.dispatchEvent).toHaveBeenCalledWith(
        'invoice.paid',
        mockEvent,
      );
    });
  });
});
