import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubscriptionPlanService } from 'src/modules/subscription/services/subscription-plan.service';
import { OfferEntityFactory } from 'src/modules/subscription/factories/offer-entity.factory';
import { DatabaseModule } from 'src/database/database.module';
import { SubscriptionPlanEntity } from 'src/database/entities/subscription-plan.entity';
import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';
import { randomUUID } from 'crypto';

describe('SubscriptionPlanService (integration)', () => {
  let app: INestApplication;
  let subscriptionPlanService: SubscriptionPlanService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [SubscriptionPlanService, OfferEntityFactory],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    subscriptionPlanService = app.get(SubscriptionPlanService);
    dataSource = app.get(DataSource);
  });

  afterEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE subscription_offers RESTART IDENTITY CASCADE',
    );
    await dataSource.query(
      'TRUNCATE TABLE subscription_plans RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  const createPlan = (
    overrides: Partial<{
      name: string;
      description: string;
      offers: { durationMonths: number; price: number }[];
    }> = {},
  ) => {
    return subscriptionPlanService.create({
      name: overrides.name ?? `Plan-${Date.now()}`,
      description: overrides.description ?? 'Test description',
      offers: overrides.offers ?? [{ durationMonths: 1, price: 9.99 }],
    });
  };

  describe('create', () => {
    it('creates a subscription plan with offers', async () => {
      const plan = await createPlan({
        name: 'Premium',
        description: 'Premium plan',
        offers: [
          { durationMonths: 1, price: 9.99 },
          { durationMonths: 6, price: 49.99 },
        ],
      });

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.name).toBe('Premium');

      const savedPlan = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOne({
          where: { id: plan.id },
          relations: ['offers'],
        });

      expect(savedPlan).toBeDefined();
      expect(savedPlan!.offers).toHaveLength(2);
    });

    it('throws ConflictException when plan with same name exists', async () => {
      await createPlan({ name: 'Duplicate' });

      await expect(createPlan({ name: 'Duplicate' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAllWithOffersForAdmin', () => {
    it('returns all plans including soft-deleted', async () => {
      const plan1 = await createPlan({ name: 'Active Plan' });
      const plan2 = await createPlan({ name: 'Deactivated Plan' });

      await subscriptionPlanService.deactivatePlan(plan2.id);

      const plans = await subscriptionPlanService.findAllWithOffersForAdmin();

      expect(plans.length).toBe(2);
      const names = plans.map((p) => p.name);
      expect(names).toContain('Active Plan');
      expect(names).toContain('Deactivated Plan');
    });

    it('returns plans with their offers', async () => {
      await createPlan({
        name: 'With Offers',
        offers: [
          { durationMonths: 1, price: 5.99 },
          { durationMonths: 12, price: 59.99 },
        ],
      });

      const plans = await subscriptionPlanService.findAllWithOffersForAdmin();

      expect(plans).toHaveLength(1);
      expect(plans[0].offers).toHaveLength(2);
    });
  });

  describe('findAllWithOffersForUser', () => {
    it('returns only active plans with active offers', async () => {
      const activePlan = await createPlan({ name: 'Active' });
      const deactivatedPlan = await createPlan({ name: 'Inactive' });

      await subscriptionPlanService.deactivatePlan(deactivatedPlan.id);

      const plans = await subscriptionPlanService.findAllWithOffersForUser();

      expect(plans).toHaveLength(1);
      expect(plans[0].name).toBe('Active');
    });

    it('returns empty array when no active plans exist', async () => {
      const plans = await subscriptionPlanService.findAllWithOffersForUser();
      expect(plans).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('updates plan name', async () => {
      const plan = await createPlan({ name: 'Old Name' });

      await subscriptionPlanService.update(plan.id, { name: 'New Name' });

      const updated = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOneBy({ id: plan.id });

      expect(updated!.name).toBe('New Name');
    });

    it('updates plan description', async () => {
      const plan = await createPlan({ description: 'Old' });

      await subscriptionPlanService.update(plan.id, {
        description: 'New description',
      });

      const updated = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOneBy({ id: plan.id });

      expect(updated!.description).toBe('New description');
    });

    it('throws ConflictException when updating to existing name', async () => {
      const plan1 = await createPlan({ name: 'Plan A' });
      await createPlan({ name: 'Plan B' });

      await expect(
        subscriptionPlanService.update(plan1.id, { name: 'Plan A' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when plan does not exist', async () => {
      await expect(
        subscriptionPlanService.update(randomUUID(), { name: 'New' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('activatePlan', () => {
    it('activates a deactivated plan', async () => {
      const plan = await createPlan({ name: 'Reactivate' });

      await subscriptionPlanService.deactivatePlan(plan.id);

      let found = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOne({ where: { id: plan.id }, withDeleted: true });
      expect(found!.deletedAt).not.toBeNull();

      await subscriptionPlanService.activatePlan(plan.id);

      found = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOneBy({ id: plan.id });
      expect(found).toBeDefined();
      expect(found!.deletedAt).toBeNull();
    });

    it('throws NotFoundException when plan does not exist', async () => {
      await expect(
        subscriptionPlanService.activatePlan(randomUUID()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deactivatePlan', () => {
    it('soft-deletes an active plan', async () => {
      const plan = await createPlan({ name: 'To Deactivate' });

      await subscriptionPlanService.deactivatePlan(plan.id);

      const found = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOne({ where: { id: plan.id }, withDeleted: true });

      expect(found).toBeDefined();
      expect(found!.deletedAt).not.toBeNull();
    });

    it('throws NotFoundException when plan does not exist', async () => {
      await expect(
        subscriptionPlanService.deactivatePlan(randomUUID()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
