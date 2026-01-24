import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GcsImageService } from 'src/modules/storage/gcs-image.service';
import { ImageStoragePath } from 'src/modules/storage/storage-path.enum';
import { Storage } from '@google-cloud/storage';

jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: jest.fn((name: string) => ({
        name: name,
        file: jest.fn(() => ({
          save: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
          getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url']),
        })),
      })),
    })),
  };
});

const MockStorage = Storage as jest.MockedClass<typeof Storage>;

describe('GcsImageService', () => {
  let service: GcsImageService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcsImageService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                GCS_PUBLIC_BUCKET_NAME: 'test-public-bucket',
                GCS_PRIVATE_BUCKET_NAME: 'test-private-bucket',
              };
              if (config[key]) return config[key];
              throw new Error(`Missing ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get(GcsImageService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize with public and private buckets', () => {
      expect(service).toBeDefined();
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'GCS_PUBLIC_BUCKET_NAME',
      );
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'GCS_PRIVATE_BUCKET_NAME',
      );
    });

    it('should throw if GCS_PUBLIC_BUCKET_NAME not set', () => {
      const badConfig = {
        getOrThrow: jest.fn(() => {
          throw new Error('Missing GCS_PUBLIC_BUCKET_NAME');
        }),
      } as unknown as ConfigService;

      expect(() => new GcsImageService(badConfig)).toThrow(
        'Missing GCS_PUBLIC_BUCKET_NAME',
      );
    });

    it('should throw if GCS_PRIVATE_BUCKET_NAME not set', () => {
      const badConfig = {
        getOrThrow: jest.fn((key: string) => {
          if (key === 'GCS_PUBLIC_BUCKET_NAME') return 'public-bucket';
          throw new Error('Missing GCS_PRIVATE_BUCKET_NAME');
        }),
      } as unknown as ConfigService;

      expect(() => new GcsImageService(badConfig)).toThrow(
        'Missing GCS_PRIVATE_BUCKET_NAME',
      );
    });
  });

  describe('upload', () => {
    it('should upload to public bucket with correct metadata', async () => {
      const buffer = Buffer.from('test');
      const input = { buffer, contentType: 'image/png' };
      const options = {
        path: ImageStoragePath.PERSON_AVATARS,
        extension: 'png',
        isPublic: true,
      };

      const result = await service.upload(input, options);

      expect(result.storageKey).toMatch(
        new RegExp(`^${options.path}/\\d+-[a-f0-9-]+\\.png$`),
      );
    });

    it('should upload to private bucket with correct metadata', async () => {
      const buffer = Buffer.from('test');
      const input = { buffer, contentType: 'image/jpeg' };
      const options = {
        path: ImageStoragePath.PERSON_AVATARS,
        extension: 'jpeg',
        isPublic: false,
      };

      const result = await service.upload(input, options);

      expect(result.storageKey).toMatch(
        new RegExp(`^${options.path}/\\d+-[a-f0-9-]+\\.jpeg$`),
      );
    });
  });

  describe('getPublicUrl', () => {
    it('should return correct public URL', () => {
      const storageKey = 'persons/avatar.png';
      const url = service.getPublicUrl(storageKey);

      expect(url).toBe(
        `https://storage.googleapis.com/test-public-bucket/${storageKey}`,
      );
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL for private file', async () => {
      const storageKey = 'persons/document.pdf';
      const url = await service.getSignedUrl(storageKey);

      expect(url).toBe('https://signed-url');
    });
  });

  describe('delete', () => {
    it('should delete from public bucket', async () => {
      const key = 'persons/avatar.png';
      await service.delete(key, true);

      expect(MockStorage.mock.results[0].value.bucket).toHaveBeenCalledWith(
        'test-public-bucket',
      );
    });

    it('should delete from private bucket', async () => {
      const key = 'persons/document.pdf';
      await service.delete(key, false);

      expect(MockStorage.mock.results[0].value.bucket).toHaveBeenCalledWith(
        'test-private-bucket',
      );
    });
  });
});
