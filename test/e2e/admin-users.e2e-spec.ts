import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { UserEntity } from 'src/database/entities/user.entity';
import { CountryEntity } from 'src/database/entities/country.entity';
import { UserRole } from 'src/modules/users/user-role.enum';
import { hash } from 'argon2';
import { AppModule } from 'src/app.module';
import { randomUUID } from 'crypto';

describe('AdminUsers (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let superAdmin: UserEntity;
  let user: UserEntity;

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

    const dataSource = app.get(DataSource);
    const usersRepository = dataSource.getRepository(UserEntity);

    superAdmin = await usersRepository.save({
      ...(await generateTestUser()),
      role: UserRole.SUPERADMIN,
    });

    user = await usersRepository.save({
      ...(await generateTestUser()),
      role: UserRole.USER,
    });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: superAdmin.email,
        password: 'Password123!',
      });

    accessToken = loginRes.body.accessToken;
  });

  const generateTestUser = async () => {
    const timestamp = Date.now();
    return {
      firstName: 'Test',
      lastName: 'User',
      email: `user+${timestamp}@test.com`,
      password: await hash('Password123!'),
      dateOfBirth: '2000-01-01',
      country: { code: 'UA' } as CountryEntity,
    };
  };

  afterAll(async () => {
    await app.close();
  });

  describe('GET /admin/users', () => {
    it('200 + array of users', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.meta).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          lastPage: expect.any(Number),
        }),
      );
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should return 401 Unauthorized without admin token', async () => {
      await request(app.getHttpServer()).get('/admin/users').expect(401);
    });
  });

  describe('POST /admin/users/:id/admin', () => {
    it('200 + promotion confirmation', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/users/${user.id}/admin`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'User promoted to admin successfully',
      });
    });

    it('should return 404 Not Found for non-existing user', async () => {
      await request(app.getHttpServer())
        .post(`/admin/users/${randomUUID()}/admin`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 409 Conflict when promoting an already admin user', async () => {
      await request(app.getHttpServer())
        .post(`/admin/users/${user.id}/admin`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);
    });
  });

  describe('DELETE /admin/users/:id/admin', () => {
    it('200 + demotion confirmation', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/admin/users/${user.id}/admin`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'User demoted from admin successfully',
      });
    });

    it('should return 404 Not Found for non-existing user', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${randomUUID()}/admin`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 409 Conflict when demoting a non-admin user', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/users/${user.id}/admin`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(409);
    });
  });
});
