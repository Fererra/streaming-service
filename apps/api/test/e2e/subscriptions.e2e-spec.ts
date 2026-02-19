import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { UserEntity } from '../../src/database/entities/user.entity';
import { CountryEntity } from '../../src/database/entities/country.entity';
import { UserRole } from '../../src/modules/users/user-role.enum';
import { SubscriptionOfferEntity } from '../../src/database/entities/subscription-offer.entity';
import { hash } from 'argon2';
import { AppModule } from '../../src/app.module';

describe('SubscriptionController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminAccessToken: string;

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
    const admin = await usersRepository.save({
      firstName: 'Admin',
      lastName: 'Sub',
      email: `admin+sub+${Date.now()}@test.com`,
      password: await hash('Password123!'),
      dateOfBirth: '2000-01-01',
      country: { code: 'UA' } as CountryEntity,
      role: UserRole.SUPERADMIN,
    });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, password: 'Password123!' });

    adminAccessToken = loginRes.body.accessToken;
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

  const seedPlanViaAdmin = async (
    name: string,
    offers: { durationMonths: number; price: number }[],
    options?: { deactivate?: boolean },
  ): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/admin/subscriptions')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ name, description: `${name} description`, offers })
      .expect(201);

    const subscriptionId = res.body.subscriptionId;

    if (options?.deactivate) {
      await request(app.getHttpServer())
        .patch(`/admin/subscriptions/${subscriptionId}/deactivate`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);
    }

    return subscriptionId;
  };

  describe('GET /subscriptions', () => {
    it('200 — returns active plans with their offers (no auth required)', async () => {
      await seedPlanViaAdmin('Basic', [
        { durationMonths: 1, price: 4.99 },
        { durationMonths: 12, price: 49.99 },
      ]);

      await seedPlanViaAdmin('Premium', [{ durationMonths: 1, price: 9.99 }]);

      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(2);

      for (const plan of res.body) {
        expect(plan).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
            offers: expect.any(Array),
          }),
        );

        for (const offer of plan.offers) {
          expect(offer).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              durationMonths: expect.any(Number),
              price: expect.any(String),
            }),
          );
        }
      }
    });

    it('200 — does not return deactivated plans', async () => {
      await seedPlanViaAdmin('Active Plan', [
        { durationMonths: 1, price: 4.99 },
      ]);

      await seedPlanViaAdmin(
        'Inactive Plan',
        [{ durationMonths: 1, price: 9.99 }],
        { deactivate: true },
      );

      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Active Plan');
    });

    it('200 — returns empty array when no active plans exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('200 — does not include deactivated offers in active plans', async () => {
      const planId = await seedPlanViaAdmin('Mixed Offers', [
        { durationMonths: 1, price: 4.99 },
        { durationMonths: 6, price: 24.99 },
      ]);

      const offers = await dataSource
        .getRepository(SubscriptionOfferEntity)
        .find({
          where: { subscriptionPlan: { id: planId } },
          order: { durationMonths: 'ASC' },
        });

      await request(app.getHttpServer())
        .patch(
          `/admin/subscriptions/${planId}/offers/${offers[0].id}/deactivate`,
        )
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/subscriptions')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].offers).toHaveLength(1);
      expect(res.body[0].offers[0].durationMonths).toBe(6);
    });
  });
});
