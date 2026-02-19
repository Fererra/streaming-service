import { Test } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersMediaService } from '../../src/modules/users/services/users-media.service';
import { UsersModule } from '../../src/modules/users/users.module';
import { TokenModule } from '../../src/modules/token/token.module';
import { CountryEntity } from '../../src/database/entities/country.entity';
import { UserEntity } from '../../src/database/entities/user.entity';
import { UploadIntentEntity } from '../../src/database/entities/upload-intent.entity';
import { OBJECT_STORAGE } from '../../src/modules/storage/storage.token';
import { IntentStatus } from '../../src/modules/storage/intent-status.enum';
import { ConfigModule } from '@nestjs/config';

describe('UsersMediaService (integration)', () => {
  let app: INestApplication;
  let usersMediaService: UsersMediaService;
  let dataSource: DataSource;
  let country: CountryEntity;

  const storageMock = {
    generateSignedUploadUrl: jest.fn().mockResolvedValue('https://signed-url'),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test.local',
        }),
        UsersModule,
        TokenModule,
      ],
    })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(storageMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    usersMediaService = app.get(UsersMediaService);
    dataSource = app.get(DataSource);

    await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE upload_intents RESTART IDENTITY CASCADE',
    );

    country = dataSource.getRepository(CountryEntity).create({
      code: 'US',
      countryName: 'United States',
    });
    await dataSource.getRepository(CountryEntity).save(country);
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE upload_intents RESTART IDENTITY CASCADE',
    );
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  const createUser = async (overrides: Partial<UserEntity> = {}) => {
    const userRepo = dataSource.getRepository(UserEntity);
    const user = userRepo.create({
      email: `test-${Date.now()}@mail.com`,
      firstName: 'Test',
      lastName: 'User',
      password: 'hashedpassword',
      dateOfBirth: new Date('2000-01-01'),
      country,
      ...overrides,
    });
    return userRepo.save(user);
  };

  describe('updateAvatar', () => {
    it('creates upload intent and returns signed URL', async () => {
      const user = await createUser();

      const result = await usersMediaService.updateAvatar(
        user.id,
        'image/jpeg',
      );

      expect(result.uploadUrl).toBe('https://signed-url');
      expect(result.storageKey).toContain('avatars/');
      expect(result.storageKey).toContain('.jpg');

      const intentRepo = dataSource.getRepository(UploadIntentEntity);
      const intent = await intentRepo.findOneBy({
        entityId: user.id,
        entityType: 'user_avatar',
      });

      expect(intent).toBeDefined();
      expect(intent!.status).toBe(IntentStatus.PENDING);
      expect(intent!.storageKey).toBe(result.storageKey);
    });
  });

  describe('confirmAvatar', () => {
    it('confirms avatar upload and updates user', async () => {
      const user = await createUser();

      const { storageKey } = await usersMediaService.updateAvatar(
        user.id,
        'image/jpeg',
      );

      await usersMediaService.confirmAvatar(user.id, storageKey);

      const updatedUser = await dataSource
        .getRepository(UserEntity)
        .findOneBy({ id: user.id });

      expect(updatedUser!.avatarPath).toBe(storageKey);

      const intent = await dataSource
        .getRepository(UploadIntentEntity)
        .findOneBy({ entityId: user.id });

      expect(intent!.status).toBe(IntentStatus.COMPLETED);
    });

    it('deletes old avatar when updating to new one', async () => {
      const oldAvatarPath = 'avatars/old-avatar.jpg';
      const user = await createUser({ avatarPath: oldAvatarPath });

      const { storageKey } = await usersMediaService.updateAvatar(
        user.id,
        'image/jpeg',
      );

      await usersMediaService.confirmAvatar(user.id, storageKey);

      expect(storageMock.delete).toHaveBeenCalledWith(
        oldAvatarPath,
        expect.anything(),
      );
    });

    it('throws BadRequestException when no valid intent exists', async () => {
      const user = await createUser();

      await expect(
        usersMediaService.confirmAvatar(user.id, 'non-existent-key'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when file does not exist in storage', async () => {
      const user = await createUser();
      storageMock.exists.mockResolvedValueOnce(false);

      const { storageKey } = await usersMediaService.updateAvatar(
        user.id,
        'image/jpeg',
      );

      await expect(
        usersMediaService.confirmAvatar(user.id, storageKey),
      ).rejects.toThrow('File not found in storage');

      const intent = await dataSource
        .getRepository(UploadIntentEntity)
        .findOneBy({ entityId: user.id });

      expect(intent!.status).toBe(IntentStatus.FAILED);
    });

    it('throws BadRequestException when intent is expired', async () => {
      const user = await createUser();

      const intentRepo = dataSource.getRepository(UploadIntentEntity);
      const storageKey = 'avatars/expired-test.jpg';
      await intentRepo.save({
        entityType: 'user_avatar',
        entityId: user.id,
        storageKey,
        contentType: 'image/jpeg',
        expiresAt: new Date(Date.now() - 1000),
        status: IntentStatus.PENDING,
      });

      await expect(
        usersMediaService.confirmAvatar(user.id, storageKey),
      ).rejects.toThrow('Upload intent expired');

      const intent = await intentRepo.findOneBy({ entityId: user.id });
      expect(intent!.status).toBe(IntentStatus.EXPIRED);

      expect(storageMock.delete).toHaveBeenCalledWith(
        storageKey,
        expect.anything(),
      );
    });

    it('prevents double confirmation (race condition)', async () => {
      const user = await createUser();

      const { storageKey } = await usersMediaService.updateAvatar(
        user.id,
        'image/jpeg',
      );

      await usersMediaService.confirmAvatar(user.id, storageKey);

      await expect(
        usersMediaService.confirmAvatar(user.id, storageKey),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles concurrent confirmations correctly with pessimistic locking', async () => {
      const user = await createUser();

      const { storageKey } = await usersMediaService.updateAvatar(
        user.id,
        'image/jpeg',
      );

      const results = await Promise.allSettled([
        usersMediaService.confirmAvatar(user.id, storageKey),
        usersMediaService.confirmAvatar(user.id, storageKey),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });
});
