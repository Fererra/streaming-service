import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GcsObjectStorage } from 'src/modules/storage/gcs-object-storage.service';
import { BucketType } from 'src/modules/storage/object-storage.interface';
import { Storage } from '@google-cloud/storage';

jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: jest.fn((name: string) => ({
        name: name,
        file: jest.fn(() => ({
          delete: jest.fn().mockResolvedValue(undefined),
          exists: jest.fn().mockResolvedValue([true]),
          getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url']),
        })),
      })),
    })),
  };
});

const MockStorage = Storage as jest.MockedClass<typeof Storage>;

describe('GcsObjectStorage', () => {
  let service: GcsObjectStorage;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcsObjectStorage,
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

    service = module.get(GcsObjectStorage);
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

      expect(() => new GcsObjectStorage(badConfig)).toThrow(
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

      expect(() => new GcsObjectStorage(badConfig)).toThrow(
        'Missing GCS_PRIVATE_BUCKET_NAME',
      );
    });
  });

  describe('generateSignedUploadUrl', () => {
    it('should generate signed upload URL for public bucket', async () => {
      const options = {
        bucket: BucketType.PUBLIC,
        storageKey: 'avatars/test.png',
        contentType: 'image/png',
        expiresInMs: 15 * 60 * 1000,
      };

      const result = await service.generateSignedUploadUrl(options);

      expect(result).toBe('https://signed-url');
    });

    it('should generate signed upload URL for private bucket', async () => {
      const options = {
        bucket: BucketType.PRIVATE,
        storageKey: 'documents/test.pdf',
        contentType: 'application/pdf',
        expiresInMs: 15 * 60 * 1000,
      };

      const result = await service.generateSignedUploadUrl(options);

      expect(result).toBe('https://signed-url');
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      const result = await service.exists('test-key', BucketType.PUBLIC);

      expect(result).toBe(true);
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
      await service.delete(key, BucketType.PUBLIC);

      expect(MockStorage.mock.results[0].value.bucket).toHaveBeenCalledWith(
        'test-public-bucket',
      );
    });

    it('should delete from private bucket', async () => {
      const key = 'persons/document.pdf';
      await service.delete(key, BucketType.PRIVATE);

      expect(MockStorage.mock.results[0].value.bucket).toHaveBeenCalledWith(
        'test-private-bucket',
      );
    });
  });
});
