import { Test } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PersonsMediaService } from 'src/modules/persons/services/persons-media.service';
import { PersonsModule } from 'src/modules/persons/persons.module';
import { DatabaseModule } from 'src/database/database.module';
import { CountryEntity } from 'src/database/entities/country.entity';
import { PersonEntity } from 'src/database/entities/person.entity';
import { UploadIntentEntity } from 'src/database/entities/upload-intent.entity';
import { OBJECT_STORAGE } from 'src/modules/storage/storage.token';
import { IntentStatus } from 'src/modules/storage/intent-status.enum';

describe('PersonsMediaService (integration)', () => {
  let app: INestApplication;
  let personsMediaService: PersonsMediaService;
  let dataSource: DataSource;
  let country: CountryEntity;

  const storageMock = {
    generateSignedUploadUrl: jest.fn().mockResolvedValue('https://signed-url'),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, PersonsModule],
    })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(storageMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    personsMediaService = app.get(PersonsMediaService);
    dataSource = app.get(DataSource);

    await dataSource.query('TRUNCATE TABLE persons RESTART IDENTITY CASCADE');
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
    await dataSource.query('TRUNCATE TABLE persons RESTART IDENTITY CASCADE');
    await dataSource.query(
      'TRUNCATE TABLE upload_intents RESTART IDENTITY CASCADE',
    );
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  const createPerson = async (overrides: Partial<PersonEntity> = {}) => {
    const personRepo = dataSource.getRepository(PersonEntity);
    const person = personRepo.create({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      country,
      ...overrides,
    });
    return personRepo.save(person);
  };

  describe('updatePhoto', () => {
    it('creates upload intent and returns signed URL', async () => {
      const person = await createPerson();

      const result = await personsMediaService.updatePhoto(
        person.id,
        'image/png',
      );

      expect(result.uploadUrl).toBe('https://signed-url');
      expect(result.storageKey).toContain('persons/');
      expect(result.storageKey).toContain('.png');

      const intentRepo = dataSource.getRepository(UploadIntentEntity);
      const intent = await intentRepo.findOneBy({
        entityId: person.id,
        entityType: 'person_photo',
      });

      expect(intent).toBeDefined();
      expect(intent!.status).toBe(IntentStatus.PENDING);
      expect(intent!.storageKey).toBe(result.storageKey);
    });

    it('throws NotFoundException for non-existent person', async () => {
      await expect(
        personsMediaService.updatePhoto(
          '00000000-0000-0000-0000-000000000000',
          'image/jpeg',
        ),
      ).rejects.toThrow('Person not found');
    });
  });

  describe('confirmPhoto', () => {
    it('confirms photo upload and updates person', async () => {
      const person = await createPerson();

      const { storageKey } = await personsMediaService.updatePhoto(
        person.id,
        'image/jpeg',
      );

      await personsMediaService.confirmPhoto(person.id, storageKey);

      const updatedPerson = await dataSource
        .getRepository(PersonEntity)
        .findOneBy({ id: person.id });

      expect(updatedPerson!.photoPath).toBe(storageKey);

      const intent = await dataSource
        .getRepository(UploadIntentEntity)
        .findOneBy({ entityId: person.id });

      expect(intent!.status).toBe(IntentStatus.COMPLETED);
    });

    it('deletes old photo when updating to new one', async () => {
      const oldPhotoPath = 'persons/old-photo.jpg';
      const person = await createPerson({ photoPath: oldPhotoPath });

      const { storageKey } = await personsMediaService.updatePhoto(
        person.id,
        'image/jpeg',
      );

      await personsMediaService.confirmPhoto(person.id, storageKey);

      expect(storageMock.delete).toHaveBeenCalledWith(
        oldPhotoPath,
        expect.anything(),
      );
    });

    it('throws BadRequestException when no valid intent exists', async () => {
      const person = await createPerson();

      await expect(
        personsMediaService.confirmPhoto(person.id, 'non-existent-key'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when file does not exist in storage', async () => {
      const person = await createPerson();
      storageMock.exists.mockResolvedValueOnce(false);

      const { storageKey } = await personsMediaService.updatePhoto(
        person.id,
        'image/jpeg',
      );

      await expect(
        personsMediaService.confirmPhoto(person.id, storageKey),
      ).rejects.toThrow('File not found in storage');

      const intent = await dataSource
        .getRepository(UploadIntentEntity)
        .findOneBy({ entityId: person.id });

      expect(intent!.status).toBe(IntentStatus.FAILED);
    });

    it('throws BadRequestException when intent is expired', async () => {
      const person = await createPerson();

      const intentRepo = dataSource.getRepository(UploadIntentEntity);
      const storageKey = 'persons/expired-test.jpg';
      await intentRepo.save({
        entityType: 'person_photo',
        entityId: person.id,
        storageKey,
        contentType: 'image/jpeg',
        expiresAt: new Date(Date.now() - 1000),
        status: IntentStatus.PENDING,
      });

      await expect(
        personsMediaService.confirmPhoto(person.id, storageKey),
      ).rejects.toThrow('Upload intent expired');

      const intent = await intentRepo.findOneBy({ entityId: person.id });
      expect(intent!.status).toBe(IntentStatus.EXPIRED);

      expect(storageMock.delete).toHaveBeenCalledWith(
        storageKey,
        expect.anything(),
      );
    });

    it('prevents double confirmation (race condition)', async () => {
      const person = await createPerson();

      const { storageKey } = await personsMediaService.updatePhoto(
        person.id,
        'image/jpeg',
      );

      await personsMediaService.confirmPhoto(person.id, storageKey);

      await expect(
        personsMediaService.confirmPhoto(person.id, storageKey),
      ).rejects.toThrow(BadRequestException);
    });

    it('handles concurrent confirmations correctly with pessimistic locking', async () => {
      const person = await createPerson();

      const { storageKey } = await personsMediaService.updatePhoto(
        person.id,
        'image/jpeg',
      );

      const results = await Promise.allSettled([
        personsMediaService.confirmPhoto(person.id, storageKey),
        personsMediaService.confirmPhoto(person.id, storageKey),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });
});
