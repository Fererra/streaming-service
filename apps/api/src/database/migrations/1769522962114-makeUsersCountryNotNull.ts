import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeUsersCountryNotNull1769522962114 implements MigrationInterface {
    name = 'MakeUsersCountryNotNull1769522962114'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_3af2173ef46868bbebe55ab4d4d"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "country_code" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_3af2173ef46868bbebe55ab4d4d" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_3af2173ef46868bbebe55ab4d4d"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "country_code" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_3af2173ef46868bbebe55ab4d4d" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
