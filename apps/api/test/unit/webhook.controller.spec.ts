import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from '../../src/modules/payment/webhook.controller';
import { PaymentService } from '../../src/modules/payment/payment.service';

describe('WebhookController', () => {
  let controller: WebhookController;

  const paymentServiceMock = {
    handleWebhookEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [{ provide: PaymentService, useValue: paymentServiceMock }],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    const payload = Buffer.from('{"type":"checkout.session.completed"}');
    const signature = 'whsec_test_signature';

    it('should call paymentService.handleWebhookEvent with payload and signature', async () => {
      paymentServiceMock.handleWebhookEvent.mockResolvedValue(undefined);

      await controller.handleWebhook(payload, signature);

      expect(paymentServiceMock.handleWebhookEvent).toHaveBeenCalledWith(
        payload,
        signature,
      );
    });

    it('should return { received: true } on success', async () => {
      paymentServiceMock.handleWebhookEvent.mockResolvedValue(undefined);

      const result = await controller.handleWebhook(payload, signature);

      expect(result).toEqual({ received: true });
    });

    it('should propagate errors from service', async () => {
      const error = new Error('Invalid signature');
      paymentServiceMock.handleWebhookEvent.mockRejectedValue(error);

      await expect(
        controller.handleWebhook(payload, signature),
      ).rejects.toThrow('Invalid signature');
    });
  });
});
