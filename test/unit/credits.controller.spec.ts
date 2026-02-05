import { Test, TestingModule } from '@nestjs/testing';
import { CreditsController } from 'src/modules/reference/credits/credits.controller';
import { CreditsService } from 'src/modules/reference/credits/credits.service';

describe('CreditsController', () => {
  let controller: CreditsController;

  const creditsServiceMock = {
    getAllCreditRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditsController],
      providers: [{ provide: CreditsService, useValue: creditsServiceMock }],
    }).compile();

    controller = module.get<CreditsController>(CreditsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllCreditRoles', () => {
    it('should return all credits', async () => {
      const result = [
        { id: 'uuid-1', role: 'Actor' },
        { id: 'uuid-2', role: 'Director' },
      ];

      creditsServiceMock.getAllCreditRoles.mockResolvedValue(result);

      const credits = await controller.getAllCreditRoles();

      expect(creditsServiceMock.getAllCreditRoles).toHaveBeenCalled();
      expect(credits).toEqual(result);
    });
  });
});
