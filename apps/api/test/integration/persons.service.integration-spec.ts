import { Test } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PersonsService } from '../../src/modules/persons/services/persons.service';
import { PersonsModule } from '../../src/modules/persons/persons.module';
import { DatabaseModule } from '../../src/database/database.module';
import { CountryEntity } from '../../src/database/entities/country.entity';
import { PersonEntity } from '../../src/database/entities/person.entity';
import { randomUUID } from 'crypto';
import { OBJECT_STORAGE } from '../../src/modules/storage/storage.token';

describe('PersonsService (integration)', () => {
  let app: INestApplication;
  let personsService: PersonsService;
  let dataSource: DataSource;
  let country: CountryEntity;

  const storageMock = {
    generateSignedUploadUrl: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
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

    personsService = app.get(PersonsService);
    dataSource = app.get(DataSource);

    country = dataSource.getRepository(CountryEntity).create({
      code: 'US',
      countryName: 'United States',
    });
    await dataSource.getRepository(CountryEntity).save(country);
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE persons RESTART IDENTITY CASCADE');
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('create', () => {
    it('creates a person successfully', async () => {
      const person = await personsService.create({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        country: 'US',
      });

      expect(person).toBeDefined();
      expect(person.firstName).toBe('John');
      expect(person.lastName).toBe('Doe');
    });
  });

  describe('findAll', () => {
    it('retrieves all persons', async () => {
      const person = await personsService.create({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        country: 'US',
      });

      const result = await personsService.findAll({ page: 1, limit: 10 });

      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe(person.id);
      expect(result.data[0].firstName).toBe('John');
    });

    it('retrieves persons with pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await personsService.create({
          firstName: `Person${i}`,
          lastName: 'TestLast',
          dateOfBirth: new Date('1990-01-01'),
          country: 'US',
        });
      }

      const firstPage = await personsService.findAll({ page: 1, limit: 10 });
      const secondPage = await personsService.findAll({ page: 2, limit: 10 });

      expect(firstPage.data.length).toBe(10);
      expect(secondPage.data.length).toBe(5);
      expect(firstPage.meta.total).toBe(15);
    });

    it('retrieves persons with search query', async () => {
      await personsService.create({
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        country: 'US',
      });

      await personsService.create({
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1995-01-01'),
        country: 'US',
      });

      const result = await personsService.findAll(
        { page: 1, limit: 10 },
        'John',
      );

      expect(result.meta.total).toBe(1);
      expect(result.data[0].firstName).toBe('John');
    });
  });

  describe('update', () => {
    it('updates a person successfully', async () => {
      const person = await personsService.create({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1995-01-01'),
        country: 'US',
      });

      await personsService.update(person.id, { firstName: 'Janet' });

      const updated = await personsService.findAll({ page: 1, limit: 10 });
      expect(updated.data[0].firstName).toBe('Janet');
    });

    it('updates only provided fields', async () => {
      const person = await personsService.create({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1995-01-01'),
        country: 'US',
      });

      await personsService.update(person.id, { firstName: 'Janet' });

      const updated = await personsService.findAll({ page: 1, limit: 10 });
      expect(updated.data[0].firstName).toBe('Janet');
      expect(updated.data[0].lastName).toBe('Doe');
    });

    it('updates country successfully', async () => {
      const person = await personsService.create({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1995-01-01'),
        country: 'US',
      });

      await personsService.update(person.id, { country: 'GB' });

      const reloaded = await dataSource.getRepository(PersonEntity).findOne({
        where: { id: person.id },
        relations: { country: true },
      });
      expect(reloaded?.country?.code).toBe('GB');
    });

    it('throws NotFoundException if person does not exist', async () => {
      await expect(
        personsService.update(randomUUID(), { firstName: 'NonExistent' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a person successfully', async () => {
      const person = await personsService.create({
        firstName: 'Mark',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-01-01'),
        country: 'US',
      });

      await personsService.delete(person.id);

      const result = await personsService.findAll({ page: 1, limit: 10 });
      expect(result.meta.total).toBe(0);
    });

    it('throws NotFoundException if person does not exist', async () => {
      await expect(personsService.delete(randomUUID())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
