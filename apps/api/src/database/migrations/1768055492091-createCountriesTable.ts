import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCountriesTable1768055492091 implements MigrationInterface {
  name = 'CreateCountriesTable1768055492091';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "countries" ("code" character(2) NOT NULL, "country_name" character varying(56) NOT NULL, CONSTRAINT "PK_b47cbb5311bad9c9ae17b8c1eda" PRIMARY KEY ("code"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "countries"`);
  }
}
