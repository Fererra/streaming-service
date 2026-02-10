import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubscriptionOfferService } from 'src/modules/subscription/services/subscription-offer.service';
import { OfferEntityFactory } from 'src/modules/subscription/factories/offer-entity.factory';
import {
  SUBSCRIPTION_PLAN_REPOSITORY,
  SUBSCRIPTION_OFFER_REPOSITORY,
} from 'src/database/repositories/tokens/repository.tokens';

describe('SubscriptionOfferService', () => {
  let service: SubscriptionOfferService;

  const subscriptionPlanRepositoryMock = {
    existsBy: jest.fn(),
  };

  const subscriptionOfferRepositoryMock = {
    existsByDurationAndPlan: jest.fn(),
    findOffersByPlanAndDurations: jest.fn(),
    findByIdAndPlanId: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    activateOffer: jest.fn(),
    deactivateOffer: jest.fn(),
  };

  const offerEntityFactoryMock = {
    createFromDto: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionOfferService,
        {
          provide: SUBSCRIPTION_PLAN_REPOSITORY,
          useValue: subscriptionPlanRepositoryMock,
        },
        {
          provide: SUBSCRIPTION_OFFER_REPOSITORY,
          useValue: subscriptionOfferRepositoryMock,
        },
        { provide: OfferEntityFactory, useValue: offerEntityFactoryMock },
      ],
    }).compile();

    service = module.get<SubscriptionOfferService>(SubscriptionOfferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('attachOffersToPlan', () => {
    const planId = 'plan-1';
    const createOffersDto = [
      { durationMonths: 1, price: 9.99 },
      { durationMonths: 6, price: 49.99 },
    ];

    it('should attach offers to a plan successfully', async () => {
      subscriptionPlanRepositoryMock.existsBy.mockResolvedValue(true);
      const mockOfferEntities = [
        { durationMonths: 1, price: 9.99, subscriptionPlanId: planId },
        { durationMonths: 6, price: 49.99, subscriptionPlanId: planId },
      ];
      offerEntityFactoryMock.createFromDto.mockReturnValue(mockOfferEntities);
      subscriptionOfferRepositoryMock.findOffersByPlanAndDurations.mockResolvedValue(
        [],
      );

      await service.attachOffersToPlan(planId, createOffersDto);

      expect(subscriptionPlanRepositoryMock.existsBy).toHaveBeenCalledWith({
        id: planId,
      });
      expect(offerEntityFactoryMock.createFromDto).toHaveBeenCalledWith(
        createOffersDto,
        planId,
      );
      expect(
        subscriptionOfferRepositoryMock.findOffersByPlanAndDurations,
      ).toHaveBeenCalledWith(planId, [1, 6]);
      expect(subscriptionOfferRepositoryMock.save).toHaveBeenCalledWith(
        mockOfferEntities,
      );
    });

    it('should throw NotFoundException if plan does not exist', async () => {
      subscriptionPlanRepositoryMock.existsBy.mockResolvedValue(false);

      await expect(
        service.attachOffersToPlan(planId, createOffersDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.attachOffersToPlan(planId, createOffersDto),
      ).rejects.toThrow('Subscription plan not found');
      expect(subscriptionOfferRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if offers with same duration already exist', async () => {
      subscriptionPlanRepositoryMock.existsBy.mockResolvedValue(true);
      const mockOfferEntities = [
        { durationMonths: 1, price: 9.99, subscriptionPlanId: planId },
      ];
      offerEntityFactoryMock.createFromDto.mockReturnValue(mockOfferEntities);
      subscriptionOfferRepositoryMock.findOffersByPlanAndDurations.mockResolvedValue(
        [{ durationMonths: 1 }],
      );

      await expect(
        service.attachOffersToPlan(planId, [
          { durationMonths: 1, price: 9.99 },
        ]),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.attachOffersToPlan(planId, [
          { durationMonths: 1, price: 9.99 },
        ]),
      ).rejects.toThrow(
        'Offer(s) with duration 1 month(s) already exist for this plan',
      );
      expect(subscriptionOfferRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('should report multiple conflicting durations sorted', async () => {
      subscriptionPlanRepositoryMock.existsBy.mockResolvedValue(true);
      const mockOfferEntities = [
        { durationMonths: 6, price: 49.99, subscriptionPlanId: planId },
        { durationMonths: 1, price: 9.99, subscriptionPlanId: planId },
      ];
      offerEntityFactoryMock.createFromDto.mockReturnValue(mockOfferEntities);
      subscriptionOfferRepositoryMock.findOffersByPlanAndDurations.mockResolvedValue(
        [{ durationMonths: 6 }, { durationMonths: 1 }],
      );

      await expect(
        service.attachOffersToPlan(planId, createOffersDto),
      ).rejects.toThrow(
        'Offer(s) with duration 1, 6 month(s) already exist for this plan',
      );
    });
  });

  describe('update', () => {
    const planId = 'plan-1';
    const offerId = 'offer-1';

    it('should update an offer successfully', async () => {
      const updateDto = { price: 14.99 };
      subscriptionOfferRepositoryMock.update.mockResolvedValue(1);

      await service.update(planId, offerId, updateDto);

      expect(subscriptionOfferRepositoryMock.update).toHaveBeenCalledWith(
        offerId,
        planId,
        updateDto,
      );
    });

    it('should validate duration uniqueness when durationMonths is provided', async () => {
      const updateDto = { durationMonths: 3 };
      subscriptionOfferRepositoryMock.existsByDurationAndPlan.mockResolvedValue(
        false,
      );
      subscriptionOfferRepositoryMock.update.mockResolvedValue(1);

      await service.update(planId, offerId, updateDto);

      expect(
        subscriptionOfferRepositoryMock.existsByDurationAndPlan,
      ).toHaveBeenCalledWith(planId, 3);
      expect(subscriptionOfferRepositoryMock.update).toHaveBeenCalledWith(
        offerId,
        planId,
        updateDto,
      );
    });

    it('should not validate duration uniqueness when durationMonths is not provided', async () => {
      const updateDto = { price: 14.99 };
      subscriptionOfferRepositoryMock.update.mockResolvedValue(1);

      await service.update(planId, offerId, updateDto);

      expect(
        subscriptionOfferRepositoryMock.existsByDurationAndPlan,
      ).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if duration already exists for plan', async () => {
      const updateDto = { durationMonths: 6 };
      subscriptionOfferRepositoryMock.existsByDurationAndPlan.mockResolvedValue(
        true,
      );

      await expect(service.update(planId, offerId, updateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(planId, offerId, updateDto)).rejects.toThrow(
        'An offer with duration 6 month(s) already exists for this plan',
      );
      expect(subscriptionOfferRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if offer not found', async () => {
      const updateDto = { price: 14.99 };
      subscriptionOfferRepositoryMock.update.mockResolvedValue(0);

      await expect(service.update(planId, offerId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(planId, offerId, updateDto)).rejects.toThrow(
        'Offer not found',
      );
    });
  });

  describe('activateOffer', () => {
    const planId = 'plan-1';
    const offerId = 'offer-1';

    it('should activate an offer successfully', async () => {
      const mockOffer = { id: offerId, durationMonths: 1, price: 9.99 };
      subscriptionOfferRepositoryMock.findByIdAndPlanId.mockResolvedValue(
        mockOffer,
      );

      await service.activateOffer(planId, offerId);

      expect(
        subscriptionOfferRepositoryMock.findByIdAndPlanId,
      ).toHaveBeenCalledWith(offerId, planId, { withDeleted: true });
      expect(
        subscriptionOfferRepositoryMock.activateOffer,
      ).toHaveBeenCalledWith(mockOffer);
    });

    it('should throw NotFoundException if offer not found', async () => {
      subscriptionOfferRepositoryMock.findByIdAndPlanId.mockResolvedValue(null);

      await expect(service.activateOffer(planId, offerId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.activateOffer(planId, offerId)).rejects.toThrow(
        'Offer not found',
      );
      expect(
        subscriptionOfferRepositoryMock.activateOffer,
      ).not.toHaveBeenCalled();
    });
  });

  describe('deactivateOffer', () => {
    const planId = 'plan-1';
    const offerId = 'offer-1';

    it('should deactivate an offer successfully', async () => {
      const mockOffer = { id: offerId, durationMonths: 1, price: 9.99 };
      subscriptionOfferRepositoryMock.findByIdAndPlanId.mockResolvedValue(
        mockOffer,
      );

      await service.deactivateOffer(planId, offerId);

      expect(
        subscriptionOfferRepositoryMock.findByIdAndPlanId,
      ).toHaveBeenCalledWith(offerId, planId);
      expect(
        subscriptionOfferRepositoryMock.deactivateOffer,
      ).toHaveBeenCalledWith(mockOffer);
    });

    it('should throw NotFoundException if offer not found', async () => {
      subscriptionOfferRepositoryMock.findByIdAndPlanId.mockResolvedValue(null);

      await expect(service.deactivateOffer(planId, offerId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deactivateOffer(planId, offerId)).rejects.toThrow(
        'Offer not found',
      );
      expect(
        subscriptionOfferRepositoryMock.deactivateOffer,
      ).not.toHaveBeenCalled();
    });
  });
});
