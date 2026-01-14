import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from 'src/modules/auth/auth.service';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserRole } from 'src/modules/users/user-role.enum';
import { CountryEntity } from 'src/database/entities/country.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { ConfigModule } from '@nestjs/config';

describe('AuthService (integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let dataSource: DataSource;
  let country: CountryEntity;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test.local',
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    authService = app.get(AuthService);
    dataSource = app.get(DataSource);

    const countryRepo = dataSource.getRepository(CountryEntity);
    country = countryRepo.create({ code: 'US', countryName: 'United States' });
    await countryRepo.save(country);
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE refresh_tokens RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('signUp', () => {
    it('creates a new user and returns tokens', async () => {
      const tokens = await authService.signUp({
        email: 'test@mail.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        dateOfBirth: '2000-01-01',
        country: 'US',
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      const userRepo = dataSource.getRepository(UserEntity);
      const user = await userRepo.findOneBy({ email: 'test@mail.com' });
      expect(user).toBeDefined();
      expect(user!.role).toBe(UserRole.USER);
    });

    it('throws ConflictException if email is already taken', async () => {
      await authService.signUp({
        email: 'test@mail.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        dateOfBirth: '2000-01-01',
        country: 'US',
      });

      await expect(
        authService.signUp({
          email: 'test@mail.com',
          firstName: 'Another',
          lastName: 'User',
          password: 'password456',
          dateOfBirth: '1990-01-01',
          country: 'US',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const userRepo = dataSource.getRepository(UserEntity);
      const hashedPassword = await authService['hashData']('password123');

      const user = userRepo.create({
        firstName: 'Login',
        lastName: 'User',
        email: 'login@mail.com',
        password: hashedPassword,
        dateOfBirth: '2000-01-01',
        country: { code: 'US' },
      });

      await userRepo.save(user);

      const tokens = await authService.login({
        email: 'login@mail.com',
        password: 'password123',
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });

    it('throws ForbiddenException for invalid email', async () => {
      await expect(
        authService.login({ email: 'wrong@mail.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException for invalid password', async () => {
      await authService.signUp({
        email: 'login2@mail.com',
        firstName: 'Login',
        lastName: 'User',
        password: 'correctpassword',
        dateOfBirth: '2000-01-01',
        country: 'US',
      });

      await expect(
        authService.login({
          email: 'login2@mail.com',
          password: 'wrongpassword',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('rotateAuthTokens & logout', () => {
    it('rotates tokens successfully', async () => {
      const { refreshToken } = await authService.signUp({
        email: 'rotate@mail.com',
        firstName: 'Rotate',
        lastName: 'User',
        password: 'password123',
        dateOfBirth: '2000-01-01',
        country: 'US',
      });

      const userRepo = dataSource.getRepository(UserEntity);
      const user = await userRepo.findOneBy({ email: 'rotate@mail.com' });

      const newTokens = await authService.rotateAuthTokens(
        refreshToken,
        user!.id,
      );

      expect(newTokens.refreshToken).not.toBe(refreshToken);
      expect(newTokens.accessToken).toBeDefined();
    });

    it('invalidates refresh token on logout', async () => {
      const { refreshToken } = await authService.signUp({
        email: 'logout@mail.com',
        firstName: 'Logout',
        lastName: 'User',
        password: 'password123',
        dateOfBirth: '2000-01-01',
        country: 'US',
      });

      const userRepo = dataSource.getRepository(UserEntity);
      const user = await userRepo.findOneBy({ email: 'logout@mail.com' });

      await authService.logout(refreshToken, user!.id);

      await expect(
        authService.logout(refreshToken, user!.id),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
