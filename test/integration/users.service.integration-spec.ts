import { Test } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersService } from 'src/modules/users/users.service';
import { DatabaseModule } from 'src/database/database.module';
import { UserRole } from 'src/modules/users/user-role.enum';
import { CountryEntity } from 'src/database/entities/country.entity';
import { randomUUID } from 'crypto';
import { IMAGE_STORAGE } from 'src/modules/storage/storage.token';

describe('UsersService (integration)', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let dataSource: DataSource;
  let country: CountryEntity;

  const imageStorageMock = {
    upload: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [
        UsersService,
        {
          provide: IMAGE_STORAGE,
          useValue: imageStorageMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    usersService = app.get(UsersService);
    dataSource = app.get(DataSource);

    country = dataSource.getRepository(CountryEntity).create({
      code: 'US',
      countryName: 'United States',
    });
    await dataSource.getRepository(CountryEntity).save(country);
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('createUser', () => {
    it('creates a user successfully', async () => {
      const email = `test-${Date.now()}@mail.com`;
      const user = await usersService.createUser({
        email,
        firstName: 'Test',
        lastName: 'User',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.firstName).toBe('Test');
    });
  });

  describe('findByEmail', () => {
    it('finds a user by email', async () => {
      const user = await usersService.createUser({
        email: `test-${Date.now()}@mail.com`,
        firstName: 'Test',
        lastName: 'User',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      const found = await usersService.findByEmail(user.email);

      expect(found).toBeDefined();
      expect(found!.id).toEqual(user.id);
    });
  });

  describe('resolveAuthUser', () => {
    it('returns auth user if exists', async () => {
      const user = await usersService.createUser({
        email: `test-${Date.now()}@mail.com`,
        firstName: 'Auth',
        lastName: 'User',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      const authUser = await usersService.resolveAuthUser(user.id);

      expect(authUser.id).toBe(user.id);
      expect(authUser.role).toBe(UserRole.USER);
    });

    it('throws Unauthorized if user not found', async () => {
      await expect(
        usersService.resolveAuthUser(randomUUID()),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('promoteToAdmin', () => {
    it('promotes user to admin', async () => {
      const user = await usersService.createUser({
        email: `admin-${Date.now()}@mail.com`,
        firstName: 'Admin',
        lastName: 'Candidate',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      await usersService.promoteToAdmin(user.id);

      const updated = await usersService.findByEmail(user.email);
      expect(updated!.role).toBe(UserRole.ADMIN);
    });

    it('throws Conflict if already admin', async () => {
      const user = await usersService.createUser({
        email: `admin-${Date.now()}@mail.com`,
        firstName: 'Admin',
        lastName: 'Already',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
        role: UserRole.ADMIN,
      });

      await expect(usersService.promoteToAdmin(user.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws NotFound if user does not exist', async () => {
      await expect(
        usersService.promoteToAdmin(randomUUID()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('demoteFromAdmin', () => {
    it('demotes admin to user', async () => {
      const user = await usersService.createUser({
        email: `demote-${Date.now()}@mail.com`,
        firstName: 'Admin',
        lastName: 'Down',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
        role: UserRole.ADMIN,
      });

      await usersService.demoteFromAdmin(user.id);

      const updated = await usersService.findByEmail(user.email);
      expect(updated!.role).toBe(UserRole.USER);
    });

    it('throws Conflict if user is not admin', async () => {
      const user = await usersService.createUser({
        email: `user-${Date.now()}@mail.com`,
        firstName: 'User',
        lastName: 'Plain',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      await expect(
        usersService.demoteFromAdmin(user.id),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('searchUsers', () => {
    it('returns paginated users', async () => {
      await usersService.createUser({
        email: 'search1@mail.com',
        firstName: 'Alice',
        lastName: 'Smith',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      await usersService.createUser({
        email: 'search2@mail.com',
        firstName: 'Bob',
        lastName: 'Jones',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      const result = await usersService.searchUsers({ page: 1, limit: 10 });

      expect(result.meta.total).toBe(2);
      expect(result.data.length).toBe(2);
      expect(result.data[0].firstName).toBeDefined();
      expect(result.data[1].firstName).toBeDefined();
    });

    it('searches by firstName', async () => {
      await usersService.createUser({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@mail.com',
        password: 'hashed',
        dateOfBirth: new Date('1990-01-01'),
        country: { code: 'US' } as CountryEntity,
      });

      const result = await usersService.searchUsers(
        { page: 1, limit: 10 },
        'Alice',
      );
      expect(result.meta.total).toBe(1);
      expect(result.data[0].firstName).toBe('Alice');
    });
  });

  describe('existsById', () => {
    it('returns true if user exists', async () => {
      const user = await usersService.createUser({
        email: 'exists@mail.com',
        firstName: 'Exist',
        lastName: 'Check',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      const exists = await usersService.existsById(user.id);
      expect(exists).toBe(true);
    });

    it('returns false if user does not exist', async () => {
      const exists = await usersService.existsById(randomUUID());
      expect(exists).toBe(false);
    });
  });

  describe('updateAvatar', () => {
    it('updates user avatar successfully and saves to database', async () => {
      const user = await usersService.createUser({
        email: `avatar-${Date.now()}@mail.com`,
        firstName: 'Avatar',
        lastName: 'User',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      (imageStorageMock.upload as jest.Mock).mockResolvedValue({
        storageKey: 'avatars/photo.png',
      });

      await usersService.updateAvatar(user.id, {
        buffer: Buffer.from('test-image-data'),
        contentType: 'image/png',
      });

      expect(imageStorageMock.upload).toHaveBeenCalled();

      const updated = await usersService.searchUsers({ page: 1, limit: 10 });
      expect(updated.data[0].avatarPath).toBe('avatars/photo.png');
    });

    it('updates avatar path when uploading new avatar', async () => {
      const user = await usersService.createUser({
        email: `update-avatar-${Date.now()}@mail.com`,
        firstName: 'Update',
        lastName: 'Avatar',
        password: 'hashed',
        dateOfBirth: new Date('2000-01-01'),
        country,
      });

      (imageStorageMock.upload as jest.Mock)
        .mockResolvedValueOnce({ storageKey: 'avatars/first-image.png' })
        .mockResolvedValueOnce({ storageKey: 'avatars/second-image.jpg' });

      (imageStorageMock.delete as jest.Mock).mockResolvedValue(undefined);

      await usersService.updateAvatar(user.id, {
        buffer: Buffer.from('first-image'),
        contentType: 'image/png',
      });

      expect(imageStorageMock.upload).toHaveBeenCalled();

      const afterFirstUpdate = await usersService.searchUsers({
        page: 1,
        limit: 10,
      });
      expect(afterFirstUpdate.data[0].avatarPath).toBe(
        'avatars/first-image.png',
      );

      await usersService.updateAvatar(user.id, {
        buffer: Buffer.from('second-image'),
        contentType: 'image/jpeg',
      });

      expect(imageStorageMock.upload).toHaveBeenCalled();
      expect(imageStorageMock.delete).toHaveBeenCalledWith(
        'avatars/first-image.png',
        false,
      );

      const afterSecondUpdate = await usersService.searchUsers({
        page: 1,
        limit: 10,
      });
      expect(afterSecondUpdate.data[0].avatarPath).toBe(
        'avatars/second-image.jpg',
      );
    });
  });
});
