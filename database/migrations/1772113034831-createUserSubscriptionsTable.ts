import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSubscriptionsTable1772113034831 implements MigrationInterface {
  name = 'CreateUserSubscriptionsTable1772113034831';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_status" AS ENUM('incomplete', 'incomplete_expired', 'active', 'past_due', 'canceled', 'unpaid')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "subscription_offer_id" uuid NOT NULL, "external_subscription_id" character varying(255) NOT NULL, "status" "public"."subscription_status" NOT NULL, "current_period_start" date NOT NULL, "current_period_end" date NOT NULL, "canceled_at" TIMESTAMP, CONSTRAINT "PK_9e928b0954e51705ab44988812c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_external_subscription_id" ON "user_subscriptions" ("external_subscription_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_external_subscription_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_subscriptions"`);
    await queryRunner.query(`DROP TYPE "public"."subscription_status"`);
  }
}
