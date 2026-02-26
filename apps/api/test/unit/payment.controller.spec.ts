import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PaymentController } from '../../src/modules/payment/payment.controller';
import { PaymentService } from '../../src/modules/payment/payment.service';
import { JwtGuard } from '../../src/modules/auth/guards/jwt.guard';
import type { CreateCheckoutDto } from '../../src/modules/payment/dto/create-checkout.dto';

describe('PaymentController', () => {
  let controller: PaymentController;

  const paymentServiceMock = {
    createCheckoutSession: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: paymentServiceMock }],
    })
      .overrideGuard(JwtGuard)
      .useValue(GuardMock)
      .compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckout', () => {
    const userId = 'user-uuid';
    const dto: CreateCheckoutDto = {
      offerId: 'offer-uuid',
      currency: 'USD',
    };

    it('should call paymentService.createCheckoutSession with correct params', async () => {
      const expectedResult = {
        checkoutUrl: 'https://checkout.stripe.com/pay/cs_123',
      };
      paymentServiceMock.createCheckoutSession.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.createCheckout(userId, dto);

      expect(paymentServiceMock.createCheckoutSession).toHaveBeenCalledWith(
        userId,
        dto,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return checkout URL from service', async () => {
      const checkoutUrl = 'https://checkout.stripe.com/pay/cs_test_456';
      paymentServiceMock.createCheckoutSession.mockResolvedValue({
        checkoutUrl,
      });

      const result = await controller.createCheckout(userId, dto);

      expect(result).toEqual({ checkoutUrl });
    });
  });
});
