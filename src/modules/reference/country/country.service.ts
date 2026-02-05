import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { ICountryRepository } from 'src/database/repositories/interfaces/country-repository.interface';
import { COUNTRY_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';

@Injectable()
export class CountryService {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countryRepository: ICountryRepository,
  ) {}

  getAllCountries() {
    return this.countryRepository.getAllCountries();
  }

  async validateExists(codes: string[]): Promise<void> {
    if (!codes || codes.length === 0) {
      return;
    }

    const foundCountries =
      await this.countryRepository.findCountriesByIds(codes);

    if (foundCountries.length !== codes.length) {
      const foundCodes = foundCountries.map((country) => country.code);
      const missingCodes = codes.filter((code) => !foundCodes.includes(code));

      throw new BadRequestException(
        `Countries not found for codes: ${missingCodes.join(', ')}`,
      );
    }
  }
}
