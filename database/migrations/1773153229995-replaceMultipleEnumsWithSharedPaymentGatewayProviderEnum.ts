import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceMultipleEnumsWithSharedPaymentGatewayProviderEnum1773153229995 implements MigrationInterface {
  name =
    'ReplaceMultipleEnumsWithSharedPaymentGatewayProviderEnum1773153229995';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."subscription_plan_gateway_products_gateway_enum" RENAME TO "subscription_plan_gateway_products_gateway_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plan_gateway_products" ALTER COLUMN "gateway" TYPE "public"."payment_gateway_provider" USING "gateway"::"text"::"public"."payment_gateway_provider"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."subscription_plan_gateway_products_gateway_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."subscription_offer_gateway_prices_gateway_enum" RENAME TO "subscription_offer_gateway_prices_gateway_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offer_gateway_prices" ALTER COLUMN "gateway" TYPE "public"."payment_gateway_provider" USING "gateway"::"text"::"public"."payment_gateway_provider"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."subscription_offer_gateway_prices_gateway_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."user_gateway_customers_gateway_enum" RENAME TO "user_gateway_customers_gateway_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_gateway_customers" ALTER COLUMN "gateway" TYPE "public"."payment_gateway_provider" USING "gateway"::"text"::"public"."payment_gateway_provider"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."user_gateway_customers_gateway_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_gateway_customers_gateway_enum_old" AS ENUM('stripe')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_gateway_customers" ALTER COLUMN "gateway" TYPE "public"."user_gateway_customers_gateway_enum_old" USING "gateway"::"text"::"public"."user_gateway_customers_gateway_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."user_gateway_customers_gateway_enum_old" RENAME TO "user_gateway_customers_gateway_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_offer_gateway_prices_gateway_enum_old" AS ENUM('stripe')`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offer_gateway_prices" ALTER COLUMN "gateway" TYPE "public"."subscription_offer_gateway_prices_gateway_enum_old" USING "gateway"::"text"::"public"."subscription_offer_gateway_prices_gateway_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."subscription_offer_gateway_prices_gateway_enum_old" RENAME TO "subscription_offer_gateway_prices_gateway_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_plan_gateway_products_gateway_enum_old" AS ENUM('stripe')`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plan_gateway_products" ALTER COLUMN "gateway" TYPE "public"."subscription_plan_gateway_products_gateway_enum_old" USING "gateway"::"text"::"public"."subscription_plan_gateway_products_gateway_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."subscription_plan_gateway_products_gateway_enum_old" RENAME TO "subscription_plan_gateway_products_gateway_enum"`,
    );
  }
}
