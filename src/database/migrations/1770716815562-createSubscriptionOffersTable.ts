import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionOffersTable1770716815562 implements MigrationInterface {
  name = 'CreateSubscriptionOffersTable1770716815562';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription_offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "duration_months" integer NOT NULL, "price" numeric(5,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "subscription_plan_id" uuid NOT NULL, CONSTRAINT "UQ_84b126cf06231159d0c81a13c04" UNIQUE ("subscription_plan_id", "duration_months"), CONSTRAINT "CHK_dc09181dad199995bdcfca09e2" CHECK (duration_months > 0), CONSTRAINT "CHK_bd0c83ea47f63177977b09c485" CHECK (price >= 0), CONSTRAINT "PK_6d5bd46e06fb7a1ce3e5e8296cc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" ADD CONSTRAINT "FK_d8fedc7f94ea38c7ea989a57d7b" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_offers" DROP CONSTRAINT "FK_d8fedc7f94ea38c7ea989a57d7b"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_offers"`);
  }
}
