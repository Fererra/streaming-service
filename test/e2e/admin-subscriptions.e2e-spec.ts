import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { UserEntity } from 'src/database/entities/user.entity';
import { CountryEntity } from 'src/database/entities/country.entity';
import { UserRole } from 'src/modules/users/user-role.enum';
import { SubscriptionPlanEntity } from 'src/database/entities/subscription-plan.entity';
import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';
import { hash } from 'argon2';
import { AppModule } from 'src/app.module';
import { randomUUID } from 'crypto';

describe('AdminSubscriptions (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);

    const usersRepository = dataSource.getRepository(UserEntity);
    const superAdmin = await usersRepository.save({
      firstName: 'Admin',
      lastName: 'Tester',
      email: `admin+${Date.now()}@test.com`,
      password: await hash('Password123!'),
      dateOfBirth: '2000-01-01',
      country: { code: 'UA' } as CountryEntity,
      role: UserRole.SUPERADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: superAdmin.email, password: 'Password123!' });

    accessToken = loginRes.body.accessToken;
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
    await app.close();
  });

  const createSubscriptionViaApi = async (
    name?: string,
    offers?: { durationMonths: number; price: number }[],
  ) => {
    const res = await request(app.getHttpServer())
      .post('/admin/subscriptions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: name ?? `Plan-${Date.now()}`,
        description: 'Test plan',
        offers: offers ?? [{ durationMonths: 1, price: 9.99 }],
      })
      .expect(201);

    return res.body;
  };

  describe('GET /admin/subscriptions', () => {
    it('200 — returns all plans including deactivated', async () => {
      await createSubscriptionViaApi('Active');
      const { subscriptionId: deactivatedId } =
        await createSubscriptionViaApi('Deactivated');

      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${deactivatedId}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      const names = res.body.map((p: any) => p.name);
      expect(names).toContain('Active');
      expect(names).toContain('Deactivated');
    });

    it('401 — without auth token', async () => {
      await request(app.getHttpServer())
        .get('/admin/subscriptions')
        .expect(401);
    });
  });

  describe('POST /admin/subscriptions', () => {
    it('201 — creates subscription plan with offers', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Premium',
          description: 'Premium plan',
          offers: [
            { durationMonths: 1, price: 9.99 },
            { durationMonths: 12, price: 99.99 },
          ],
        })
        .expect(201);

      expect(res.body).toEqual({
        subscriptionId: expect.any(String),
        message: expect.stringContaining('Premium'),
      });

      const plan = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOne({
          where: { id: res.body.subscriptionId },
          relations: ['offers'],
        });

      expect(plan).toBeDefined();
      expect(plan!.offers).toHaveLength(2);
    });

    it('409 — duplicate plan name', async () => {
      await createSubscriptionViaApi('Duplicate');

      await request(app.getHttpServer())
        .post('/admin/subscriptions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Duplicate',
          description: 'Another',
          offers: [{ durationMonths: 1, price: 5.99 }],
        })
        .expect(409);
    });

    it('401 — without auth token', async () => {
      await request(app.getHttpServer())
        .post('/admin/subscriptions')
        .send({
          name: 'Unauth',
          description: 'x',
          offers: [{ durationMonths: 1, price: 1 }],
        })
        .expect(401);
    });
  });

  describe('PATCH /admin/subscriptions/:id', () => {
    it('200 — updates plan name', async () => {
      const { subscriptionId } = await createSubscriptionViaApi('Old Name');

      const res = await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body).toEqual({
        message: 'Subscription updated successfully',
      });

      const updated = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOneBy({ id: subscriptionId });

      expect(updated!.name).toBe('New Name');
    });

    it('200 — updates plan description', async () => {
      const { subscriptionId } = await createSubscriptionViaApi();

      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      const updated = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOneBy({ id: subscriptionId });

      expect(updated!.description).toBe('Updated description');
    });

    it('404 — non-existing plan', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${randomUUID()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Whatever' })
        .expect(404);
    });
  });

  describe('POST /admin/subscriptions/:id/offers', () => {
    it('201 — attaches offers to plan', async () => {
      const { subscriptionId } = await createSubscriptionViaApi('Offers Test', [
        { durationMonths: 1, price: 5.99 },
      ]);

      const res = await request(app.getHttpServer())
        .post(`/admin/subscriptions/${subscriptionId}/offers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send([
          { durationMonths: 3, price: 14.99 },
          { durationMonths: 6, price: 29.99 },
        ])
        .expect(201);

      expect(res.body).toEqual({
        message: 'Offers successfully attached to subscription',
      });

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: subscriptionId } },
        });

      expect(offers).toHaveLength(3);
    });

    it('404 — non-existing plan', async () => {
      await request(app.getHttpServer())
        .post(`/admin/subscriptions/${randomUUID()}/offers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send([{ durationMonths: 1, price: 9.99 }])
        .expect(404);
    });

    it('409 — duplicate duration for plan', async () => {
      const { subscriptionId } = await createSubscriptionViaApi(
        'Dup Duration',
        [{ durationMonths: 1, price: 5.99 }],
      );

      await request(app.getHttpServer())
        .post(`/admin/subscriptions/${subscriptionId}/offers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send([{ durationMonths: 1, price: 10.99 }])
        .expect(409);
    });
  });

  describe('PATCH /admin/subscriptions/:planId/offers/:offerId', () => {
    it('200 — updates offer price', async () => {
      const { subscriptionId } = await createSubscriptionViaApi(
        'Update Offer',
        [{ durationMonths: 1, price: 9.99 }],
      );

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({ where: { subscriptionPlan: { id: subscriptionId } } });

      const res = await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}/offers/${offers[0].id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ price: 14.99 })
        .expect(200);

      expect(res.body).toEqual({
        message: 'Offers successfully updated',
      });
    });

    it('409 — updating duration to an existing one', async () => {
      const { subscriptionId } = await createSubscriptionViaApi(
        'Conflict Upd',
        [
          { durationMonths: 1, price: 5.99 },
          { durationMonths: 3, price: 14.99 },
        ],
      );

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: subscriptionId } },
          order: { durationMonths: 'ASC' },
        });

      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}/offers/${offers[0].id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ durationMonths: 3 })
        .expect(409);
    });

    it('404 — non-existing offer', async () => {
      const { subscriptionId } = await createSubscriptionViaApi();

      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}/offers/${randomUUID()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ price: 19.99 })
        .expect(404);
    });
  });

  describe('PATCH /admin/subscriptions/:id/activate', () => {
    it('200 — activates a deactivated plan', async () => {
      const { subscriptionId } = await createSubscriptionViaApi('Activate Me');

      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Subscription plan activated successfully',
      });

      const plan = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOneBy({ id: subscriptionId });
      expect(plan).toBeDefined();
      expect(plan!.deletedAt).toBeNull();
    });

    it('404 — non-existing plan', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${randomUUID()}/activate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/subscriptions/:id/deactivate', () => {
    it('200 — deactivates an active plan', async () => {
      const { subscriptionId } =
        await createSubscriptionViaApi('Deactivate Me');

      const res = await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Subscription plan deactivated successfully',
      });

      const plan = await dataSource
        .getRepository(SubscriptionPlanEntity)
        .findOne({
          where: { id: subscriptionId },
          withDeleted: true,
        });
      expect(plan!.deletedAt).not.toBeNull();
    });

    it('404 — non-existing plan', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${randomUUID()}/deactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/subscriptions/:planId/offers/:offerId/activate', () => {
    it('200 — activates a deactivated offer', async () => {
      const { subscriptionId } = await createSubscriptionViaApi(
        'Offer Activate',
        [{ durationMonths: 1, price: 9.99 }],
      );

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({ where: { subscriptionPlan: { id: subscriptionId } } });
      const offerId = offers[0].id;

      await request(app.getHttpServer())
        .patch(
          `/admin/subscriptions/${subscriptionId}/offers/${offerId}/deactivate`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(
          `/admin/subscriptions/${subscriptionId}/offers/${offerId}/activate`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Offer activated successfully',
      });
    });

    it('404 — non-existing offer', async () => {
      const { subscriptionId } = await createSubscriptionViaApi();

      await request(app.getHttpServer())
        .patch(
          `/admin/subscriptions/${subscriptionId}/offers/${randomUUID()}/activate`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/subscriptions/:planId/offers/:offerId/deactivate', () => {
    it('200 — deactivates an active offer', async () => {
      const { subscriptionId } = await createSubscriptionViaApi(
        'Offer Deactivate',
        [{ durationMonths: 1, price: 9.99 }],
      );

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({ where: { subscriptionPlan: { id: subscriptionId } } });
      const offerId = offers[0].id;

      const res = await request(app.getHttpServer())
        .patch(
          `/admin/subscriptions/${subscriptionId}/offers/${offerId}/deactivate`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Offer deactivated successfully',
      });

      const found = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .findOne({ where: { id: offerId }, withDeleted: true });
      expect(found!.deletedAt).not.toBeNull();
    });

    it('404 — non-existing offer', async () => {
      const { subscriptionId } = await createSubscriptionViaApi();

      await request(app.getHttpServer())
        .patch(
          `/admin/subscriptions/${subscriptionId}/offers/${randomUUID()}/deactivate`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
