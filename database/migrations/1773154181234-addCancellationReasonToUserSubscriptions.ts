import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancellationReasonToUserSubscriptions1773154181234 implements MigrationInterface {
  name = 'AddCancellationReasonToUserSubscriptions1773154181234';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."cancellation_reason" AS ENUM('user_canceled', 'admin_canceled', 'payment_failed', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD "cancellation_reason" "public"."cancellation_reason"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN "cancellation_reason"`,
    );
    await queryRunner.query(`DROP TYPE "public"."cancellation_reason"`);
  }
}
