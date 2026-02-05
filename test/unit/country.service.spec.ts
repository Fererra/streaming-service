import { Test, TestingModule } from '@nestjs/testing';
import { COUNTRY_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { CountryService } from 'src/modules/reference/country/country.service';

describe('CountryService', () => {
  let service: CountryService;

  const countryRepositoryMock = {
    getAllCountries: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryService,
        { provide: COUNTRY_REPOSITORY, useValue: countryRepositoryMock },
      ],
    }).compile();

    service = module.get<CountryService>(CountryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve all countries', async () => {
    const mockCountries = [
      { code: 'US', countryName: 'United States' },
      { code: 'CA', countryName: 'Canada' },
    ];
    countryRepositoryMock.getAllCountries.mockResolvedValue(mockCountries);

    const result = await service.getAllCountries();

    expect(countryRepositoryMock.getAllCountries).toHaveBeenCalled();
    expect(result).toEqual(mockCountries);
  });
});
