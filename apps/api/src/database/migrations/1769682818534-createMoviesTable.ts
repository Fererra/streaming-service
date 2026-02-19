import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMoviesTable1769682818534 implements MigrationInterface {
  name = 'CreateMoviesTable1769682818534';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."movies_age_rating_enum" AS ENUM('G', 'PG', 'PG-13', 'R', 'NC-17')`,
    );
    await queryRunner.query(
      `CREATE TABLE "movies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "poster_path" character varying(255), "age_rating" "public"."movies_age_rating_enum" NOT NULL, "duration_minutes" integer NOT NULL, "rating" numeric(3,1), "release_year" integer NOT NULL, "description" text, "trailer_path" character varying(255), "movie_path" character varying(255), CONSTRAINT "UQ_448d925267d7d12df5f7f49cf30" UNIQUE ("title", "release_year"), CONSTRAINT "CHK_ec9bb974ec619ac5bcca76af3c" CHECK ("duration_minutes" > 0), CONSTRAINT "CHK_c814d538867cf8574462d45f28" CHECK ("rating" >= 0 AND "rating" <= 10), CONSTRAINT "PK_c5b2c134e871bfd1c2fe7cc3705" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "movie_countries" ("moviesId" uuid NOT NULL, "countriesCode" character(2) NOT NULL, CONSTRAINT "PK_198cae12b78b02184a74493edcb" PRIMARY KEY ("moviesId", "countriesCode"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee41b08c553c52454cd97cc2a8" ON "movie_countries" ("moviesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b1302ca4a747b47d30d3c34af1" ON "movie_countries" ("countriesCode") `,
    );
    await queryRunner.query(
      `CREATE TABLE "movie_genres" ("moviesId" uuid NOT NULL, "genresId" uuid NOT NULL, CONSTRAINT "PK_95881fc90bc59c23cc1e0a595af" PRIMARY KEY ("moviesId", "genresId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6414c430d7ed6fd0821e56964b" ON "movie_genres" ("moviesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_13017cf7e6e979595b6032388c" ON "movie_genres" ("genresId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_countries" ADD CONSTRAINT "FK_ee41b08c553c52454cd97cc2a89" FOREIGN KEY ("moviesId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_countries" ADD CONSTRAINT "FK_b1302ca4a747b47d30d3c34af1d" FOREIGN KEY ("countriesCode") REFERENCES "countries"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_genres" ADD CONSTRAINT "FK_6414c430d7ed6fd0821e56964ba" FOREIGN KEY ("moviesId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_genres" ADD CONSTRAINT "FK_13017cf7e6e979595b6032388cd" FOREIGN KEY ("genresId") REFERENCES "genres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "movie_genres" DROP CONSTRAINT "FK_13017cf7e6e979595b6032388cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_genres" DROP CONSTRAINT "FK_6414c430d7ed6fd0821e56964ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_countries" DROP CONSTRAINT "FK_b1302ca4a747b47d30d3c34af1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_countries" DROP CONSTRAINT "FK_ee41b08c553c52454cd97cc2a89"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_13017cf7e6e979595b6032388c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6414c430d7ed6fd0821e56964b"`,
    );
    await queryRunner.query(`DROP TABLE "movie_genres"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b1302ca4a747b47d30d3c34af1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee41b08c553c52454cd97cc2a8"`,
    );
    await queryRunner.query(`DROP TABLE "movie_countries"`);
    await queryRunner.query(`DROP TABLE "movie_credits"`);
    await queryRunner.query(`DROP TABLE "movies"`);
    await queryRunner.query(`DROP TYPE "public"."movies_age_rating_enum"`);
  }
}
