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

describe('AdminPersons (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let admin: UserEntity;
  let testPersonId: string;

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

  describe('PATCH /admin/persons/:id/photo', () => {
    it('should update person photo with valid image', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/persons/${testPersonId}/photo`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('photo', Buffer.from('fake image data'), 'test.jpg')
        .expect(200);

      expect(res.body).toEqual({
        message: 'Person photo updated successfully',
      });
    });

    it('should return 400 when file is missing', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/persons/${testPersonId}/photo`)
        .set('Authorization', `Bearer ${accessToken}`)
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
