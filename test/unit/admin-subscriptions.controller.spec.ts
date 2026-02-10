import { Test, TestingModule } from '@nestjs/testing';
import { AdminSubscriptionsController } from 'src/modules/admin/admin-subcriptions.controller';
import { SubscriptionPlanService } from 'src/modules/subscription/services/subscription-plan.service';
import { SubscriptionOfferService } from 'src/modules/subscription/services/subscription-offer.service';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtGuard } from 'src/modules/auth/guards/jwt.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';

describe('AdminSubscriptionsController', () => {
  let controller: AdminSubscriptionsController;

  const subscriptionPlanServiceMock = {
    findAllWithOffersForAdmin: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    activatePlan: jest.fn(),
    deactivatePlan: jest.fn(),
  };

  const subscriptionOfferServiceMock = {
    attachOffersToPlan: jest.fn(),
    update: jest.fn(),
    activateOffer: jest.fn(),
    deactivateOffer: jest.fn(),
  };

  const GuardMock: CanActivate = {
    canActivate: jest.fn((_context: ExecutionContext) => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSubscriptionsController],
      providers: [
        {
          provide: SubscriptionPlanService,
          useValue: subscriptionPlanServiceMock,
        },
        {
          provide: SubscriptionOfferService,
          useValue: subscriptionOfferServiceMock,
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue(GuardMock)
      .overrideGuard(RolesGuard)
      .useValue(GuardMock)
      .compile();

    controller = module.get<AdminSubscriptionsController>(
      AdminSubscriptionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions for admin', () => {
      const mockPlans = [
        { id: 'plan-1', name: 'Basic', offers: [] },
        { id: 'plan-2', name: 'Premium', offers: [] },
      ];
      subscriptionPlanServiceMock.findAllWithOffersForAdmin.mockReturnValue(
        mockPlans,
      );

      const result = controller.getAllSubscriptions();

      expect(
        subscriptionPlanServiceMock.findAllWithOffersForAdmin,
      ).toHaveBeenCalled();
      expect(result).toEqual(mockPlans);
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription and return id with message', async () => {
      const createDto = {
        name: 'Premium',
        description: 'Premium plan',
        offers: [{ durationMonths: 1, price: 9.99 }],
      };
      const mockSubscription = { id: 'sub-123', name: 'Premium' };
      subscriptionPlanServiceMock.create.mockResolvedValue(mockSubscription);

      const result = await controller.createSubscription(createDto);

      expect(subscriptionPlanServiceMock.create).toHaveBeenCalledWith(
        createDto,
      );
      expect(result).toEqual({
        subscriptionId: 'sub-123',
        message: 'Subscription Premium created successfully',
      });
    });
  });

  describe('updateSubscription', () => {
    it('should update a subscription and return success message', async () => {
      const updateDto = { name: 'Updated Plan' };
      subscriptionPlanServiceMock.update.mockResolvedValue(undefined);

      const result = await controller.updateSubscription('plan-1', updateDto);

      expect(subscriptionPlanServiceMock.update).toHaveBeenCalledWith(
        'plan-1',
        updateDto,
      );
      expect(result).toEqual({
        message: 'Subscription updated successfully',
      });
    });
  });

  describe('createOffer', () => {
    it('should attach offers to a plan and return success message', async () => {
      const createOffersDto = [
        { durationMonths: 1, price: 9.99 },
        { durationMonths: 6, price: 49.99 },
      ];
      subscriptionOfferServiceMock.attachOffersToPlan.mockResolvedValue(
        undefined,
      );

      const result = await controller.createOffer('plan-1', createOffersDto);

      expect(
        subscriptionOfferServiceMock.attachOffersToPlan,
      ).toHaveBeenCalledWith('plan-1', createOffersDto);
      expect(result).toEqual({
        message: 'Offers successfully attached to subscription',
      });
    });
  });

  describe('updateOffers', () => {
    it('should update an offer and return success message', async () => {
      const updateOfferDto = { price: 14.99 };
      subscriptionOfferServiceMock.update.mockResolvedValue(undefined);

      const result = await controller.updateOffers(
        'plan-1',
        'offer-1',
        updateOfferDto,
      );

      expect(subscriptionOfferServiceMock.update).toHaveBeenCalledWith(
        'plan-1',
        'offer-1',
        updateOfferDto,
      );
      expect(result).toEqual({
        message: 'Offers successfully updated',
      });
    });
  });

  describe('activatePlan', () => {
    it('should activate a plan and return success message', async () => {
      subscriptionPlanServiceMock.activatePlan.mockResolvedValue(undefined);

      const result = await controller.activatePlan('plan-1');

      expect(subscriptionPlanServiceMock.activatePlan).toHaveBeenCalledWith(
        'plan-1',
      );
      expect(result).toEqual({
        message: 'Subscription plan activated successfully',
      });
    });
  });

  describe('deactivatePlan', () => {
    it('should deactivate a plan and return success message', async () => {
      subscriptionPlanServiceMock.deactivatePlan.mockResolvedValue(undefined);

      const result = await controller.deactivatePlan('plan-1');

      expect(subscriptionPlanServiceMock.deactivatePlan).toHaveBeenCalledWith(
        'plan-1',
      );
      expect(result).toEqual({
        message: 'Subscription plan deactivated successfully',
      });
    });
  });

  describe('activateOffer', () => {
    it('should activate an offer and return success message', async () => {
      subscriptionOfferServiceMock.activateOffer.mockResolvedValue(undefined);

      const result = await controller.activateOffer('plan-1', 'offer-1');

      expect(subscriptionOfferServiceMock.activateOffer).toHaveBeenCalledWith(
        'plan-1',
        'offer-1',
      );
      expect(result).toEqual({
        message: 'Offer activated successfully',
      });
    });
  });

  describe('deactivateOffer', () => {
    it('should deactivate an offer and return success message', async () => {
      subscriptionOfferServiceMock.deactivateOffer.mockResolvedValue(undefined);

      const result = await controller.deactivateOffer('plan-1', 'offer-1');

      expect(subscriptionOfferServiceMock.deactivateOffer).toHaveBeenCalledWith(
        'plan-1',
        'offer-1',
      );
      expect(result).toEqual({
        message: 'Offer deactivated successfully',
      });
    });
  });
});
