import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubscriptionPlanService } from '../../src/modules/subscription/services/subscription-plan.service';
import { OfferEntityFactory } from '../../src/modules/subscription/factories/offer-entity.factory';
import { SUBSCRIPTION_PLAN_REPOSITORY } from '../../src/database/repositories/tokens/repository.tokens';
import { SubscriptionOfferService } from '../../src/modules/subscription/services/subscription-offer.service';

describe('SubscriptionPlanService', () => {
  let service: SubscriptionPlanService;

  const subscriptionPlanRepositoryMock = {
    findAllWithOffers: jest.fn(),
    findActiveWithOffers: jest.fn(),
    existsBy: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    activatePlan: jest.fn(),
    deactivatePlan: jest.fn(),
  };

  const subscriptionOfferServiceMock = {
    syncOfferToGateway: jest.fn(),
  };

  const offerEntityFactoryMock = {
    createFromDto: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPlanService,
        {
          provide: SUBSCRIPTION_PLAN_REPOSITORY,
          useValue: subscriptionPlanRepositoryMock,
        },
        {
          provide: SubscriptionOfferService,
          useValue: subscriptionOfferServiceMock,
        },
        { provide: OfferEntityFactory, useValue: offerEntityFactoryMock },
      ],
    }).compile();

    service = module.get<SubscriptionPlanService>(SubscriptionPlanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllWithOffersForAdmin', () => {
    it('should return all subscription plans with offers', () => {
      const mockPlans = [
        { id: 'plan-1', name: 'Basic', offers: [] },
        { id: 'plan-2', name: 'Premium', offers: [] },
      ];
      subscriptionPlanRepositoryMock.findAllWithOffers.mockReturnValue(
        mockPlans,
      );

      const result = service.findAllWithOffersForAdmin();

      expect(
        subscriptionPlanRepositoryMock.findAllWithOffers,
      ).toHaveBeenCalled();
      expect(result).toEqual(mockPlans);
    });
  });

  describe('findAllWithOffersForUser', () => {
    it('should return active subscription plans with offers', () => {
      const mockPlans = [{ id: 'plan-1', name: 'Basic', offers: [] }];
      subscriptionPlanRepositoryMock.findActiveWithOffers.mockReturnValue(
        mockPlans,
      );

      const result = service.findAllWithOffersForUser();

      expect(
        subscriptionPlanRepositoryMock.findActiveWithOffers,
      ).toHaveBeenCalled();
      expect(result).toEqual(mockPlans);
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Premium',
      description: 'Premium plan',
      offers: [{ durationMonths: 1, price: 9.99 }],
    };

    it('should create a subscription plan successfully', async () => {
      subscriptionPlanRepositoryMock.existsBy.mockResolvedValue(false);
      const mockOfferEntities = [{ durationMonths: 1, price: 9.99 }];
      offerEntityFactoryMock.createFromDto.mockReturnValue(mockOfferEntities);
      const mockSavedPlan = {
        id: 'plan-1',
        name: 'Premium',
        offers: mockOfferEntities,
      };
      subscriptionPlanRepositoryMock.save.mockResolvedValue(mockSavedPlan);

      const result = await service.create(createDto);

      expect(subscriptionPlanRepositoryMock.existsBy).toHaveBeenCalledWith({
        name: 'Premium',
      });
      expect(offerEntityFactoryMock.createFromDto).toHaveBeenCalledWith(
        createDto.offers,
      );
      expect(subscriptionPlanRepositoryMock.save).toHaveBeenCalledWith(
        { name: 'Premium', description: 'Premium plan' },
        mockOfferEntities,
      );
      expect(result).toEqual(mockSavedPlan);
    });

    it('should throw ConflictException if subscription name already exists', async () => {
      subscriptionPlanRepositoryMock.existsBy.mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Subscription with name Premium already exists',
      );
      expect(subscriptionPlanRepositoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a subscription plan successfully', async () => {
      const updateDto = { name: 'Updated Plan' };
      subscriptionPlanRepositoryMock.existsBy.mockResolvedValue(false);
      subscriptionPlanRepositoryMock.update.mockResolvedValue(1);

      await service.update('plan-1', updateDto);

      expect(subscriptionPlanRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: 'plan-1',
        name: 'Updated Plan',
      });
      expect(subscriptionPlanRepositoryMock.update).toHaveBeenCalledWith(
        'plan-1',
        updateDto,
      );
    });

    it('should update without name check when name is not provided', async () => {
      const updateDto = { description: 'Updated description' };
      subscriptionPlanRepositoryMock.update.mockResolvedValue(1);

      await service.update('plan-1', updateDto);

      expect(subscriptionPlanRepositoryMock.existsBy).not.toHaveBeenCalled();
      expect(subscriptionPlanRepositoryMock.update).toHaveBeenCalledWith(
        'plan-1',
        updateDto,
      );
    });

    it('should throw ConflictException if updated name already exists', async () => {
      const updateDto = { name: 'Existing Plan' };
      subscriptionPlanRepositoryMock.existsBy.mockResolvedValue(true);

      await expect(service.update('plan-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update('plan-1', updateDto)).rejects.toThrow(
        'Subscription with name Existing Plan already exists',
      );
      expect(subscriptionPlanRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if subscription plan not found', async () => {
      const updateDto = { description: 'Updated' };
      subscriptionPlanRepositoryMock.update.mockResolvedValue(0);

      await expect(service.update('plan-1', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('plan-1', updateDto)).rejects.toThrow(
        'Subscription plan not found',
      );
    });
  });

  describe('activatePlan', () => {
    it('should activate a plan successfully', async () => {
      const mockPlan = { id: 'plan-1', name: 'Basic' };
      subscriptionPlanRepositoryMock.findById.mockResolvedValue(mockPlan);

      await service.activatePlan('plan-1');

      expect(subscriptionPlanRepositoryMock.findById).toHaveBeenCalledWith(
        'plan-1',
        { withDeleted: true },
      );
      expect(subscriptionPlanRepositoryMock.activatePlan).toHaveBeenCalledWith(
        mockPlan,
      );
    });

    it('should throw NotFoundException if plan not found', async () => {
      subscriptionPlanRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.activatePlan('plan-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.activatePlan('plan-1')).rejects.toThrow(
        'Subscription plan not found',
      );
      expect(
        subscriptionPlanRepositoryMock.activatePlan,
      ).not.toHaveBeenCalled();
    });
  });

  describe('deactivatePlan', () => {
    it('should deactivate a plan successfully', async () => {
      const mockPlan = { id: 'plan-1', name: 'Basic' };
      subscriptionPlanRepositoryMock.findById.mockResolvedValue(mockPlan);

      await service.deactivatePlan('plan-1');

      expect(subscriptionPlanRepositoryMock.findById).toHaveBeenCalledWith(
        'plan-1',
      );
      expect(
        subscriptionPlanRepositoryMock.deactivatePlan,
      ).toHaveBeenCalledWith(mockPlan);
    });

    it('should throw NotFoundException if plan not found', async () => {
      subscriptionPlanRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.deactivatePlan('plan-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deactivatePlan('plan-1')).rejects.toThrow(
        'Subscription plan not found',
      );
      expect(
        subscriptionPlanRepositoryMock.deactivatePlan,
      ).not.toHaveBeenCalled();
    });
  });
});
