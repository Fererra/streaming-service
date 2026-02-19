import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CountryEntity } from '../entities/country.entity';
import { In, Repository } from 'typeorm';
import { ICountryRepository } from './interfaces/country-repository.interface';

@Injectable()
export class CountryRepository implements ICountryRepository {
  constructor(
    @InjectRepository(CountryEntity)
    private readonly repository: Repository<CountryEntity>,
  ) {}

  getAllCountries(): Promise<CountryEntity[]> {
    return this.repository.find({ order: { countryName: 'ASC' } });
  }

  findCountriesByIds(ids: string[]): Promise<CountryEntity[]> {
    return this.repository.find({ select: ['code'], where: { code: In(ids) } });
  }
}
