import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubscriptionOfferService } from 'src/modules/subscription/services/subscription-offer.service';
import { SubscriptionPlanService } from 'src/modules/subscription/services/subscription-plan.service';
import { OfferEntityFactory } from 'src/modules/subscription/factories/offer-entity.factory';
import { DatabaseModule } from 'src/database/database.module';
import { SubscriptionPlanEntity } from 'src/database/entities/subscription-plan.entity';
import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';
import { randomUUID } from 'crypto';

describe('SubscriptionOfferService (integration)', () => {
  let app: INestApplication;
  let subscriptionOfferService: SubscriptionOfferService;
  let subscriptionPlanService: SubscriptionPlanService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        SubscriptionOfferService,
        SubscriptionPlanService,
        OfferEntityFactory,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    subscriptionOfferService = app.get(SubscriptionOfferService);
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

  const createPlan = async (
    name?: string,
    offers: { durationMonths: number; price: number }[] = [
      { durationMonths: 1, price: 9.99 },
    ],
  ): Promise<SubscriptionPlanEntity> => {
    return subscriptionPlanService.create({
      name: name ?? `Plan-${Date.now()}`,
      description: 'Test plan',
      offers,
    });
  };

  describe('attachOffersToPlan', () => {
    it('attaches new offers to an existing plan', async () => {
      const plan = await createPlan('Attach Test', [
        { durationMonths: 1, price: 5.99 },
      ]);

      await subscriptionOfferService.attachOffersToPlan(plan.id, [
        { durationMonths: 3, price: 14.99 },
        { durationMonths: 6, price: 29.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
        });

      expect(offers).toHaveLength(3);
      const durations = offers
        .map((o) => o.durationMonths)
        .sort((a, b) => a - b);
      expect(durations).toEqual([1, 3, 6]);
    });

    it('throws NotFoundException when plan does not exist', async () => {
      await expect(
        subscriptionOfferService.attachOffersToPlan(randomUUID(), [
          { durationMonths: 1, price: 9.99 },
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when offer with same duration already exists', async () => {
      const plan = await createPlan('Conflict Test', [
        { durationMonths: 1, price: 5.99 },
      ]);

      await expect(
        subscriptionOfferService.attachOffersToPlan(plan.id, [
          { durationMonths: 1, price: 9.99 },
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when multiple duplicate durations exist', async () => {
      const plan = await createPlan('Multi Conflict', [
        { durationMonths: 1, price: 5.99 },
        { durationMonths: 3, price: 14.99 },
      ]);

      await expect(
        subscriptionOfferService.attachOffersToPlan(plan.id, [
          { durationMonths: 1, price: 9.99 },
          { durationMonths: 3, price: 19.99 },
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('updates offer price', async () => {
      const plan = await createPlan('Update Price', [
        { durationMonths: 1, price: 9.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
        });
      const offerId = offers[0].id;

      await subscriptionOfferService.update(plan.id, offerId, {
        price: 14.99,
      });

      const updated = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .findOneBy({ id: offerId });

      expect(Number(updated!.price)).toBe(14.99);
    });

    it('updates offer duration', async () => {
      const plan = await createPlan('Update Duration', [
        { durationMonths: 1, price: 9.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
        });
      const offerId = offers[0].id;

      await subscriptionOfferService.update(plan.id, offerId, {
        durationMonths: 3,
      });

      const updated = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .findOneBy({ id: offerId });

      expect(updated!.durationMonths).toBe(3);
    });

    it('throws ConflictException when updating duration to an existing one', async () => {
      const plan = await createPlan('Duration Conflict', [
        { durationMonths: 1, price: 5.99 },
        { durationMonths: 3, price: 14.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
          order: { durationMonths: 'ASC' },
        });

      const firstOfferId = offers[0].id;

      await expect(
        subscriptionOfferService.update(plan.id, firstOfferId, {
          durationMonths: 3,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException when offer does not exist', async () => {
      const plan = await createPlan('No Offer');

      await expect(
        subscriptionOfferService.update(plan.id, randomUUID(), {
          price: 19.99,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when plan does not match', async () => {
      const plan = await createPlan('Mismatch', [
        { durationMonths: 1, price: 9.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
        });

      await expect(
        subscriptionOfferService.update(randomUUID(), offers[0].id, {
          price: 19.99,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('activateOffer', () => {
    it('activates a deactivated offer', async () => {
      const plan = await createPlan('Activate Offer', [
        { durationMonths: 1, price: 9.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
        });
      const offerId = offers[0].id;

      await subscriptionOfferService.deactivateOffer(plan.id, offerId);

      let found = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .findOne({ where: { id: offerId }, withDeleted: true });
      expect(found!.deletedAt).not.toBeNull();

      await subscriptionOfferService.activateOffer(plan.id, offerId);

      found = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .findOneBy({ id: offerId });
      expect(found).toBeDefined();
      expect(found!.deletedAt).toBeNull();
    });

    it('throws NotFoundException when offer does not exist', async () => {
      const plan = await createPlan('No Offer Activate');

      await expect(
        subscriptionOfferService.activateOffer(plan.id, randomUUID()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when plan does not match', async () => {
      const plan = await createPlan('Wrong Plan Activate', [
        { durationMonths: 1, price: 9.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
        });

      await subscriptionOfferService.deactivateOffer(plan.id, offers[0].id);

      await expect(
        subscriptionOfferService.activateOffer(randomUUID(), offers[0].id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deactivateOffer', () => {
    it('soft-deletes an active offer', async () => {
      const plan = await createPlan('Deactivate Offer', [
        { durationMonths: 1, price: 9.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
        });
      const offerId = offers[0].id;

      await subscriptionOfferService.deactivateOffer(plan.id, offerId);

      const found = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .findOne({ where: { id: offerId }, withDeleted: true });

      expect(found).toBeDefined();
      expect(found!.deletedAt).not.toBeNull();
    });

    it('throws NotFoundException when offer does not exist', async () => {
      const plan = await createPlan('No Offer Deactivate');

      await expect(
        subscriptionOfferService.deactivateOffer(plan.id, randomUUID()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when plan does not match', async () => {
      const plan = await createPlan('Wrong Plan Deactivate', [
        { durationMonths: 1, price: 9.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: plan.id } },
        });

      await expect(
        subscriptionOfferService.deactivateOffer(randomUUID(), offers[0].id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
