import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserGatewayCustomersTable1772112709148 implements MigrationInterface {
  name = 'CreateUserGatewayCustomersTable1772112709148';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_gateway_customers_gateway_enum" AS ENUM('stripe')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_gateway_customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gateway" "public"."user_gateway_customers_gateway_enum" NOT NULL, "external_customer_id" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "PK_5140bb22159e5a7757747753e45" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_gateway_customers" ADD CONSTRAINT "FK_f67aa62470dcfeb3dbdfb68c1bc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_gateway_customers" DROP CONSTRAINT "FK_f67aa62470dcfeb3dbdfb68c1bc"`,
    );
    await queryRunner.query(`DROP TABLE "user_gateway_customers"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_gateway_customers_gateway_enum"`,
    );
  }
}
