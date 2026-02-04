import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { UserEntity } from 'src/database/entities/user.entity';
import { UserRole } from 'src/modules/users/user-role.enum';
import { hash } from 'argon2';
import { AppModule } from 'src/app.module';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { CountryEntity } from 'src/database/entities/country.entity';
import { OBJECT_STORAGE } from 'src/modules/storage/storage.token';
import type { ObjectStorage } from 'src/modules/storage/object-storage.interface';

describe('AdminPersons (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let admin: UserEntity;
  let testPersonId: string;

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

    const dataSource = app.get(DataSource);
    const usersRepository = dataSource.getRepository(UserEntity);

    admin = await usersRepository.save({
      firstName: 'Test',
      lastName: 'User',
      email: `user+${Date.now()}@test.com`,
      password: await hash('Password123!'),
      dateOfBirth: '2000-01-01',
      country: { code: 'UA' } as CountryEntity,
      role: UserRole.ADMIN,
    });

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: admin.email,
        password: 'Password123!',
      });

    accessToken = adminLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /admin/persons', () => {
    it('should create a person with valid data', async () => {
      const createPersonDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1995-05-15'),
        biography: 'A talented actress',
        country: 'US',
      };

      const res = await request(app.getHttpServer())
        .post('/admin/persons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createPersonDto)
        .expect(201);

      expect(res.body).toEqual({
        personId: expect.any(String),
        message: expect.stringContaining('Jane Smith created successfully'),
      });

      testPersonId = res.body.personId;
    });

    it('should return 400 on missing required field (firstName)', async () => {
      const invalidDto = {
        lastName: 'Smith',
        dateOfBirth: '1995-05-15',
        country: 'US',
      };

      await request(app.getHttpServer())
        .post('/admin/persons')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('PATCH /admin/persons/:id', () => {
    it('should update person with valid data', async () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      await request(app.getHttpServer())
        .patch(`/admin/persons/${testPersonId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);
    });

    it('should return 400 on empty body', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/persons/${testPersonId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });

    it('should return 404 on non-existent person', async () => {
      const updateDto = {
        firstName: 'Test',
      };

      const fakeId = randomUUID();

      await request(app.getHttpServer())
        .patch(`/admin/persons/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('PATCH /admin/persons/:id/photo/upload-intent', () => {
    it('should return upload URL and storage key', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/persons/${testPersonId}/photo/upload-intent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentType: 'image/jpeg' })
        .expect(200);

      expect(res.body).toEqual({
        uploadUrl: expect.any(String),
        storageKey: expect.stringMatching(
          /^persons\/photos\/\d+-[a-f0-9-]+\.jpg$/,
        ),
      });
    });

    it('should return 400 for invalid content type', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/persons/${testPersonId}/photo/upload-intent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentType: 'application/pdf' })
        .expect(400);
    });

    it('should return 404 for non-existent person', async () => {
      const fakeId = randomUUID();

      await request(app.getHttpServer())
        .patch(`/admin/persons/${fakeId}/photo/upload-intent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentType: 'image/jpeg' })
        .expect(404);
    });
  });

  describe('POST /admin/persons/:id/photo/confirm', () => {
    it('should confirm photo upload successfully', async () => {
      const intentRes = await request(app.getHttpServer())
        .patch(`/admin/persons/${testPersonId}/photo/upload-intent`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ contentType: 'image/png' });

      const { storageKey } = intentRes.body;

      const confirmRes = await request(app.getHttpServer())
        .post(`/admin/persons/${testPersonId}/photo/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ storageKey })
        .expect(201);

      expect(confirmRes.body).toEqual({
        message: 'Photo updated successfully',
      });
    });

    it('should return 400 for invalid storage key format', async () => {
      await request(app.getHttpServer())
        .post(`/admin/persons/${testPersonId}/photo/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ storageKey: 'invalid-key' })
        .expect(400);
    });
  });

  describe('DELETE /admin/persons/:id', () => {
    it('should return person successfully and return confirmation message', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/admin/persons/${testPersonId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toEqual({
        message: 'Person deleted successfully',
      });
    });

    it('should return 404 on non-existent person', async () => {
      const fakeId = randomUUID();

      await request(app.getHttpServer())
        .delete(`/admin/persons/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
