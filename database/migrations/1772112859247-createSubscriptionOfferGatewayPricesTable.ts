import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionOfferGatewayPricesTable1772112859247 implements MigrationInterface {
  name = 'CreateSubscriptionOfferGatewayPricesTable1772112859247';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."subscription_offer_gateway_prices_gateway_enum" AS ENUM('stripe')`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_offer_gateway_prices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gateway" "public"."subscription_offer_gateway_prices_gateway_enum" NOT NULL, "external_price_id" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "subscription_offer_id" uuid NOT NULL, CONSTRAINT "PK_9bc1937fd6236b7ca2993571abc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_offer_gateway_prices" ADD CONSTRAINT "FK_48f75cb1d42e59a6f4e525a98f4" FOREIGN KEY ("subscription_offer_id") REFERENCES "subscription_offers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_offer_gateway_prices" DROP CONSTRAINT "FK_48f75cb1d42e59a6f4e525a98f4"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_offer_gateway_prices"`);
    await queryRunner.query(
      `DROP TYPE "public"."subscription_offer_gateway_prices_gateway_enum"`,
    );
  }
}
