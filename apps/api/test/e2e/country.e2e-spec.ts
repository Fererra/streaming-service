import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('CountryController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /countries', () => {
    it('200 + array of all countries', async () => {
      const response = await request(app.getHttpServer())
        .get('/countries')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      for (const item of response.body) {
        expect(item).toEqual(
          expect.objectContaining({
            code: expect.any(String),
            countryName: expect.any(String),
          }),
        );
      }
    });
  });
});
