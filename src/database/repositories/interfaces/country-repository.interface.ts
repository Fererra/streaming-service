import { CountryEntity } from 'src/database/entities/country.entity';

export interface ICountryRepository {
  getAllCountries(): Promise<CountryEntity[]>;
  findCountriesByIds(ids: string[]): Promise<CountryEntity[]>;
}
