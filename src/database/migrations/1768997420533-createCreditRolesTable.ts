import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCreditRolesTable1768997420533 implements MigrationInterface {
  name = 'CreateCreditRolesTable1768997420533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "credit_roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" character varying(50) NOT NULL, CONSTRAINT "UQ_d10d999cc35cde90200f1756257" UNIQUE ("role"), CONSTRAINT "PK_9b77bb9989347dd924f704f4d23" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "credit_roles"`);
  }
}
