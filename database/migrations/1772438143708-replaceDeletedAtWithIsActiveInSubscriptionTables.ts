import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceDeletedAtWithIsActiveInSubscriptionTables1772438143708 implements MigrationInterface {
  name = 'ReplaceDeletedAtWithIsActiveInSubscriptionTables1772438143708';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" RENAME COLUMN "deleted_at" TO "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" RENAME COLUMN "deleted_at" TO "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP COLUMN "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD "isActive" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD "isActive" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD "isActive" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP COLUMN "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD "isActive" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" RENAME COLUMN "isActive" TO "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" RENAME COLUMN "isActive" TO "deleted_at"`,
    );
  }
}
