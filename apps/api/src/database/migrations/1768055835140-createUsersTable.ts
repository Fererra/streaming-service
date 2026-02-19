import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1768055835140 implements MigrationInterface {
  name = 'CreateUsersTable1768055835140';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "date_of_birth" date NOT NULL, "role" "public"."user_role" NOT NULL DEFAULT 'USER', "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "country_code" character(2), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "CHK_43fb8246f67d63d51cbb9c9d38" CHECK ("date_of_birth" <= CURRENT_DATE), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_3af2173ef46868bbebe55ab4d4d" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_3af2173ef46868bbebe55ab4d4d"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
  }
}
