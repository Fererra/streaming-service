import { Test, TestingModule } from '@nestjs/testing';
import { CREDITS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { CreditsService } from 'src/modules/credits/credits.service';

describe('CreditsService', () => {
  let service: CreditsService;

  const creditsRepositoryMock = {
    getAllCreditRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        { provide: CREDITS_REPOSITORY, useValue: creditsRepositoryMock },
      ],
    }).compile();

    service = module.get<CreditsService>(CreditsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve all credit roles', async () => {
    const mockCreditRoles = [
      { id: 'uuid-1', role: 'Director' },
      { id: 'uuid-2', role: 'Actor' },
    ];

    creditsRepositoryMock.getAllCreditRoles.mockResolvedValue(mockCreditRoles);

    const result = await service.getAllCreditRoles();

    expect(creditsRepositoryMock.getAllCreditRoles).toHaveBeenCalled();
    expect(result).toEqual(mockCreditRoles);
  });
});
