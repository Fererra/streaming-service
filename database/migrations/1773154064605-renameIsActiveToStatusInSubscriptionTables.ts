import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameIsActiveToStatusInSubscriptionTables1773154064605 implements MigrationInterface {
  name = 'RenameIsActiveToStatusInSubscriptionTables1773154064605';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" RENAME COLUMN "isActive" TO "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" RENAME COLUMN "isActive" TO "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_offers_status_enum" AS ENUM('draft', 'active', 'deactivating', 'deactivated')`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD "status" "public"."subscription_offers_status_enum" NOT NULL DEFAULT 'draft'`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_plans_status_enum" AS ENUM('draft', 'active', 'activating', 'deactivating', 'deactivated')`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD "status" "public"."subscription_plans_status_enum" NOT NULL DEFAULT 'draft'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."subscription_plans_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD "status" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."subscription_offers_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD "status" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" RENAME COLUMN "status" TO "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" RENAME COLUMN "status" TO "isActive"`,
    );
  }
}
