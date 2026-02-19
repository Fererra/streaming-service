import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { OBJECT_STORAGE } from '../../src/modules/storage/storage.token';
import type { ObjectStorage } from '../../src/modules/storage/object-storage.interface';

describe('Users (e2e)', () => {
  let app: INestApplication;

  const mockObjectStorage: ObjectStorage = {
    generateSignedUploadUrl: jest
      .fn()
      .mockResolvedValue('https://storage.example.com/signed-upload-url'),
    exists: jest.fn().mockResolvedValue(true),
    getPublicUrl: jest
      .fn()
      .mockReturnValue('https://storage.example.com/public-url'),
    getSignedUrl: jest
      .fn()
      .mockResolvedValue('https://storage.example.com/signed-url'),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(mockObjectStorage)
      .compile();

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

  describe('Avatar Upload Flow', () => {
    let accessToken: string;

    beforeAll(async () => {
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

      accessToken = userLoginRes.body.accessToken;
    });

    describe('PATCH /users/me/avatar/upload-intent', () => {
      it('should return upload URL and storage key', async () => {
        const res = await request(app.getHttpServer())
          .patch('/users/me/avatar/upload-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ contentType: 'image/png' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          uploadUrl: expect.any(String),
          storageKey: expect.stringMatching(
            /^users\/avatars\/\d+-[a-f0-9-]+\.png$/,
          ),
        });
      });

      it('should return 400 for invalid content type', async () => {
        const res = await request(app.getHttpServer())
          .patch('/users/me/avatar/upload-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ contentType: 'application/pdf' });

        expect(res.status).toBe(400);
      });

      it('should return 401 for unauthenticated requests', async () => {
        const res = await request(app.getHttpServer())
          .patch('/users/me/avatar/upload-intent')
          .send({ contentType: 'image/png' });

        expect(res.status).toBe(401);
      });
    });

    describe('POST /users/me/avatar/confirm', () => {
      it('should confirm avatar upload successfully', async () => {
        const intentRes = await request(app.getHttpServer())
          .patch('/users/me/avatar/upload-intent')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ contentType: 'image/png' });

        const { storageKey } = intentRes.body;

        const confirmRes = await request(app.getHttpServer())
          .post('/users/me/avatar/confirm')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ storageKey });

        expect(confirmRes.status).toBe(201);
        expect(confirmRes.body).toEqual({
          message: 'Avatar updated successfully',
        });
      });

      it('should return 400 for invalid storage key format', async () => {
        const res = await request(app.getHttpServer())
          .post('/users/me/avatar/confirm')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ storageKey: 'invalid-key' });

        expect(res.status).toBe(400);
      });

      it('should return 401 for unauthenticated requests', async () => {
        const res = await request(app.getHttpServer())
          .post('/users/me/avatar/confirm')
          .send({ storageKey: 'users/avatars/123-abc.png' });

        expect(res.status).toBe(401);
      });
    });
  });
});
