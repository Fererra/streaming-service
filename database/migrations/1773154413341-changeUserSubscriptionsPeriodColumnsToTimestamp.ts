import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeUserSubscriptionsPeriodColumnsToTimestamp1773154413341 implements MigrationInterface {
  name = 'ChangeUserSubscriptionsPeriodColumnsToTimestamp1773154413341';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN "current_period_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD "current_period_start" TIMESTAMP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN "current_period_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD "current_period_end" TIMESTAMP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN "current_period_end"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD "current_period_end" date NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN "current_period_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD "current_period_start" date NOT NULL`,
    );
  }
}
