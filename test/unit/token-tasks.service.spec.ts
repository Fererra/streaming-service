import { Test, TestingModule } from '@nestjs/testing';
import { TokenTasksService } from '../../src/modules/tasks/token-tasks.service';
import { TokenService } from '../../src/modules/token/token.service';

describe('TokenTasksService', () => {
  let service: TokenTasksService;

  const mockTokenService = {
    removeExpiredTokens: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenTasksService,
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile();

    service = module.get<TokenTasksService>(TokenTasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call removeExpiredTokens when handleDailyTokenCleanup is run', async () => {
    await service.handleDailyTokenCleanup();
    expect(mockTokenService.removeExpiredTokens).toHaveBeenCalled();
  });
});
