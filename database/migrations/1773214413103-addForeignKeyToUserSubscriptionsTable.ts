import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddForeignKeyToUserSubscriptionsTable1773214413103 implements MigrationInterface {
  name = 'AddForeignKeyToUserSubscriptionsTable1773214413103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_0641da02314913e28f6131310eb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_56a31ef1d31b2ca8a52384bfdd7" FOREIGN KEY ("subscription_offer_id") REFERENCES "subscription_offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_56a31ef1d31b2ca8a52384bfdd7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_0641da02314913e28f6131310eb"`,
    );
  }
}
