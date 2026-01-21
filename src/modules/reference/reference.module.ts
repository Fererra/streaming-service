import { Module } from '@nestjs/common';
import { CountryModule } from './country/country.module';
import { CreditsModule } from './credits/credits.module';
import { GenresModule } from './genres/genres.module';

@Module({
  imports: [CountryModule, CreditsModule, GenresModule],
})
export class ReferenceModule {}
