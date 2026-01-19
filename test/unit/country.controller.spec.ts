import { Test, TestingModule } from '@nestjs/testing';
import { CountryController } from '../../src/modules/country/country.controller';
import { CountryService } from '../../src/modules/country/country.service';

describe('CountryController', () => {
  let controller: CountryController;

  const countryServiceMock = {
    getAllCountries: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountryController],
      providers: [
        {
          provide: CountryService,
          useValue: countryServiceMock,
        },
      ],
    }).compile();

    controller = module.get<CountryController>(CountryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllCountries', () => {
    it('should return all countries', async () => {
      const result = [
        { code: 'UA', countryName: 'Ukraine' },
        { code: 'US', countryName: 'United States' },
      ];

      countryServiceMock.getAllCountries.mockResolvedValue(result);

      const countries = await controller.getAllCountries();

      expect(countryServiceMock.getAllCountries).toHaveBeenCalled();
      expect(countries).toEqual(result);
    });
  });
});
