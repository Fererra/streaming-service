import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePersonsTable1769267484105 implements MigrationInterface {
    name = 'CreatePersonsTable1769267484105'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "persons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "photo_path" character varying(255), "date_of_birth" date NOT NULL, "biography" text, "country_code" character(2), CONSTRAINT "CHK_4938bbb40c15bfde6e0fb15d1e" CHECK ("date_of_birth" <= CURRENT_DATE), CONSTRAINT "PK_74278d8812a049233ce41440ac7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "persons" ADD CONSTRAINT "FK_cb0ead79e7096a60d8bbe6c9033" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "persons" DROP CONSTRAINT "FK_cb0ead79e7096a60d8bbe6c9033"`);
        await queryRunner.query(`DROP TABLE "persons"`);
    }

}
