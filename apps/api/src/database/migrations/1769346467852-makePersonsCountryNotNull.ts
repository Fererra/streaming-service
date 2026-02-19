import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePersonsCountryNotNull1769346467852 implements MigrationInterface {
    name = 'MakePersonsCountryNotNull1769346467852'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "persons" DROP CONSTRAINT "FK_cb0ead79e7096a60d8bbe6c9033"`);
        await queryRunner.query(`ALTER TABLE "persons" ALTER COLUMN "country_code" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "persons" ADD CONSTRAINT "FK_cb0ead79e7096a60d8bbe6c9033" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "persons" DROP CONSTRAINT "FK_cb0ead79e7096a60d8bbe6c9033"`);
        await queryRunner.query(`ALTER TABLE "persons" ALTER COLUMN "country_code" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "persons" ADD CONSTRAINT "FK_cb0ead79e7096a60d8bbe6c9033" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
