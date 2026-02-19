import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from '../../src/modules/subscription/subscription.controller';
import { SubscriptionPlanService } from '../../src/modules/subscription/services/subscription-plan.service';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;

  const subscriptionPlanServiceMock = {
    findAllWithOffersForUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionPlanService,
          useValue: subscriptionPlanServiceMock,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllSubscriptions', () => {
    it('should return all active subscriptions with offers', () => {
      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Basic',
          description: 'Basic plan',
          offers: [{ id: 'offer-1', durationMonths: 1, price: 9.99 }],
        },
        {
          id: 'plan-2',
          name: 'Premium',
          description: 'Premium plan',
          offers: [{ id: 'offer-2', durationMonths: 12, price: 89.99 }],
        },
      ];
      subscriptionPlanServiceMock.findAllWithOffersForUser.mockReturnValue(
        mockPlans,
      );

      const result = controller.getAllSubscriptions();

      expect(
        subscriptionPlanServiceMock.findAllWithOffersForUser,
      ).toHaveBeenCalled();
      expect(result).toEqual(mockPlans);
    });

    it('should return empty array when no subscriptions exist', () => {
      subscriptionPlanServiceMock.findAllWithOffersForUser.mockReturnValue([]);

      const result = controller.getAllSubscriptions();

      expect(result).toEqual([]);
    });
  });
});
