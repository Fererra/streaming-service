import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSubscriptionOfferPriceFieldInteger1772129086892 implements MigrationInterface {
  name = 'MakeSubscriptionOfferPriceFieldInteger1772129086892';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP CONSTRAINT "CHK_bd0c83ea47f63177977b09c485"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP COLUMN "price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD "price" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD CONSTRAINT "CHK_bd0c83ea47f63177977b09c485" CHECK (price >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP CONSTRAINT "CHK_bd0c83ea47f63177977b09c485"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP COLUMN "price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD "price" numeric(5,2) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD CONSTRAINT "CHK_bd0c83ea47f63177977b09c485" CHECK ((price >= (0)::numeric))`,
    );
  }
}
