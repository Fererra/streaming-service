import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';

describe('Users (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /users/me/avatar', () => {
    it('should update user avatar', async () => {
      const userLoginRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: `user+${Date.now()}@test.com`,
          password: 'Password123!',
          dateOfBirth: new Date('2000-01-01'),
          country: 'UA',
        });

      const accessToken = userLoginRes.body.accessToken;

      const res = await request(app.getHttpServer())
        .patch('/users/me/avatar')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('avatar', Buffer.from('test-image-data'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'User avatar updated successfully',
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me/avatar')
        .attach('avatar', Buffer.from('test-image-data'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(401);
    });
  });
});
