import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdempotencyUniqueConstraints1773509768627 implements MigrationInterface {
  name = 'AddIdempotencyUniqueConstraints1773509768627';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_payments_external_invoice_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD CONSTRAINT "uq_external_subscription_id" UNIQUE ("external_subscription_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_payments_external_invoice_id" ON "payments" ("external_invoice_id") WHERE "external_invoice_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plan_gateway_products" ADD CONSTRAINT "uq_plan_id_gateway" UNIQUE ("subscription_plan_id", "gateway")`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offer_gateway_prices" ADD CONSTRAINT "uq_offer_id_gateway" UNIQUE ("subscription_offer_id", "gateway")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_gateway_customers" ADD CONSTRAINT "uq_user_id_gateway" UNIQUE ("user_id", "gateway")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_gateway_customers" DROP CONSTRAINT "uq_user_id_gateway"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offer_gateway_prices" DROP CONSTRAINT "uq_offer_id_gateway"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plan_gateway_products" DROP CONSTRAINT "uq_plan_id_gateway"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_payments_external_invoice_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP CONSTRAINT "uq_external_subscription_id"`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_external_invoice_id" ON "payments" ("external_invoice_id") WHERE (external_invoice_id IS NOT NULL)`,
    );
  }
}
