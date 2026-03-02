import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionPlanGatewayProductsTable1772437911624 implements MigrationInterface {
  name = 'CreateSubscriptionPlanGatewayProductsTable1772437911624';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_plan_gateway_products_gateway_enum" AS ENUM('stripe')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_plan_gateway_products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gateway" "public"."subscription_plan_gateway_products_gateway_enum" NOT NULL, "external_product_id" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "subscription_plan_id" uuid NOT NULL, CONSTRAINT "PK_d5fb81424f0a08f9767562ba579" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plan_gateway_products" ADD CONSTRAINT "FK_d4503be029ecb1e15cba21f4ad7" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plan_gateway_products" DROP CONSTRAINT "FK_d4503be029ecb1e15cba21f4ad7"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_plan_gateway_products"`);
    await queryRunner.query(
      `DROP TYPE "public"."subscription_plan_gateway_products_gateway_enum"`,
    );
  }
}
