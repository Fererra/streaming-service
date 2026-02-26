import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1772113135030 implements MigrationInterface {
  name = 'CreatePaymentsTable1772113135030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_gateway_provider" AS ENUM('stripe')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "user_subscription_id" uuid, "subscription_offer_id" uuid NOT NULL, "external_invoice_id" character varying(255), "external_session_id" character varying(255), "billing_reason" character varying(255), "status" "public"."payment_status" NOT NULL DEFAULT 'pending', "amount" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "gateway" "public"."payment_gateway_provider" NOT NULL, "metadata" jsonb, "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_3f657e5c6ac76b441f2ac51428" CHECK ("amount" >= 0), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_external_invoice_id" ON "payments" ("external_invoice_id") WHERE "external_invoice_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_external_session_id" ON "payments" ("external_session_id") WHERE "external_session_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_payments_external_session_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_payments_external_invoice_id"`,
    );
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payment_gateway_provider"`);
    await queryRunner.query(`DROP TYPE "public"."payment_status"`);
  }
}
