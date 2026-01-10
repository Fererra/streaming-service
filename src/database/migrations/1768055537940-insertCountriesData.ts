import { MigrationInterface, QueryRunner } from 'typeorm';
import countries from 'i18n-iso-countries';

export class InsertCountriesData1768055537940 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const allCountries = Object.entries(
      countries.getNames('en', { select: 'official' }),
    );

    const values = allCountries
      .map(([code, name]) => `('${code}', '${name.replace("'", "''")}')`)
      .join(', ');

    await queryRunner.query(
      `INSERT INTO countries(code, country_name) VALUES ${values}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM countries`);
  }
}
