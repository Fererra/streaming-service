import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from 'src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  const generateTestUser = () => {
    const timestamp = Date.now();
    return {
      firstName: 'Test',
      lastName: 'User',
      email: `user+${timestamp}@test.com`,
      password: 'Password123!',
      dateOfBirth: '2000-01-01',
      country: 'UA',
    };
  };

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('200 + access token + refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(generateTestUser())
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refresh_token=');
    });

    it('400 on invalid body', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'not-an-email',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('200 + access token + refresh cookie', async () => {
      const user = generateTestUser();

      const signUpRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(user);

      const accessToken = signUpRes.body.accessToken;
      const cookie = signUpRes.headers['set-cookie'];

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookie);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refresh_token=');
    });

    it('403 on wrong credentials', async () => {
      const user = generateTestUser();
      await request(app.getHttpServer()).post('/auth/signup').send(user);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrong-password' })
        .expect(403);
    });
  });

  describe('POST /auth/refresh', () => {
    let cookie: string;

    beforeAll(async () => {
      const user = generateTestUser();
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(user);

      cookie = res.headers['set-cookie'];
    });

    it('200 + new access token + new refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refresh_token=');
    });

    it('401 without refresh cookie', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let cookie: string;

    beforeAll(async () => {
      const user = generateTestUser();
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(user);

      accessToken = res.body.accessToken;
      cookie = res.headers['set-cookie'];
    });

    it('200 + clears refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.message).toBe('Logged out successfully');
      expect(res.headers['set-cookie'][0]).toContain('refresh_token=;');
    });

    it('401 without access token', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});
