import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMovieCreditsTable1769682925674 implements MigrationInterface {
    name = 'CreateMovieCreditsTable1769682925674'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "movie_credits" ("movie_id" uuid NOT NULL, "person_id" uuid NOT NULL, "role_id" uuid NOT NULL, "character_name" character varying(255), "order_index" integer NOT NULL DEFAULT '0', CONSTRAINT "CHK_88d504e2d5b2876a1c4bec2888" CHECK ("order_index" >= 0), CONSTRAINT "PK_b3b5d71a3c25cd5f0cba9996893" PRIMARY KEY ("movie_id", "person_id", "role_id"))`);
        await queryRunner.query(`ALTER TABLE "movie_credits" ADD CONSTRAINT "FK_4a85a0e520cd1810563991d7098" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movie_credits" ADD CONSTRAINT "FK_5b3e2c634b6699d348866fc0436" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movie_credits" ADD CONSTRAINT "FK_c6a518bc3ee0b3960a40aa655b0" FOREIGN KEY ("role_id") REFERENCES "credit_roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movie_credits" DROP CONSTRAINT "FK_c6a518bc3ee0b3960a40aa655b0"`);
        await queryRunner.query(`ALTER TABLE "movie_credits" DROP CONSTRAINT "FK_5b3e2c634b6699d348866fc0436"`);
        await queryRunner.query(`ALTER TABLE "movie_credits" DROP CONSTRAINT "FK_4a85a0e520cd1810563991d7098"`);
        await queryRunner.query(`DROP TABLE "movie_credits"`);
    }

}
