import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TokenService } from 'src/modules/token/token.service';
import { TokenModule } from 'src/modules/token/token.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenEntity } from 'src/database/entities/refresh-token.entity';
import { DatabaseModule } from 'src/database/database.module';
import { UserRole } from 'src/modules/users/user-role.enum';
import { CountryEntity } from 'src/database/entities/country.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { randomUUID } from 'crypto';

describe('TokenService (integration)', () => {
  let app: INestApplication;
  let tokenService: TokenService;
  let dataSource: DataSource;
  let user: UserEntity;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test.local',
        }),
        DatabaseModule,
        TokenModule,
        JwtModule.register({}),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    tokenService = app.get(TokenService);
    dataSource = app.get(DataSource);

    const countryRepo = dataSource.getRepository(CountryEntity);
    const country = countryRepo.create({
      code: 'US',
      countryName: 'United States',
    });
    await countryRepo.save(country);

    const userRepo = dataSource.getRepository(UserEntity);
    user = userRepo.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@mail.com',
      password: 'hashed',
      dateOfBirth: new Date('2000-01-01'),
      role: UserRole.USER,
      country,
    });
    await userRepo.save(user);
  });

  afterEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE refresh_tokens RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('generates access and refresh tokens', async () => {
    const tokens = await tokenService.generateAuthTokens({
      userId: user.id,
      role: user.role,
    });

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    const stored = await dataSource
      .getRepository(RefreshTokenEntity)
      .findOneBy({ userId: user.id });
    expect(stored).toBeDefined();
  });

  it('rotates refresh tokens', async () => {
    const { refreshToken: oldToken } = await tokenService.generateAuthTokens({
      userId: user.id,
      role: user.role,
    });

    const newTokens = await tokenService.rotateAuthTokens(oldToken, {
      id: user.id,
      role: user.role,
    });

    const { jti } = await tokenService['jwtService'].verifyAsync(oldToken, {
      secret: process.env.REFRESH_TOKEN_SECRET,
    });

    expect(newTokens.accessToken).toBeDefined();
    expect(newTokens.refreshToken).not.toBe(oldToken);

    const oldRecord = await dataSource
      .getRepository(RefreshTokenEntity)
      .findOneBy({ id: jti });
    expect(oldRecord?.revokedAt).toBeDefined();
  });

  it('invalidates refresh token', async () => {
    const { refreshToken } = await tokenService.generateAuthTokens({
      userId: user.id,
      role: user.role,
    });

    await tokenService.invalidateRefreshToken(refreshToken, user.id);
    await expect(
      tokenService.invalidateRefreshToken(refreshToken, user.id),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('removes expired tokens', async () => {
    const repo = dataSource.getRepository(RefreshTokenEntity);
    const expiredJti = randomUUID();
    const validJti = randomUUID();

    const expiredToken = repo.create({
      id: expiredJti,
      userId: user.id,
      tokenHash: 'hashed',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: new Date(Date.now() - 5000),
    });

    const validToken = repo.create({
      id: validJti,
      userId: user.id,
      tokenHash: 'hashed',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    await repo.save([expiredToken, validToken]);

    await tokenService.removeExpiredTokens();

    const tokens = await repo.find();
    expect(tokens.length).toBe(1);
    expect(tokens[0].id).toBe(validJti);
  });
});
