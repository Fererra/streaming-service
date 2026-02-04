import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUploadIntentTable1770213211159 implements MigrationInterface {
  name = 'CreateUploadIntentTable1770213211159';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."upload_intents_status_enum" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "upload_intents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" character varying(50) NOT NULL, "entity_id" uuid NOT NULL, "storage_key" character varying(255) NOT NULL, "content_type" character varying(100) NOT NULL, "status" "public"."upload_intents_status_enum" NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_55a73699f73e06e14ec4fba6971" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "upload_intents"`);
    await queryRunner.query(`DROP TYPE "public"."upload_intents_status_enum"`);
  }
}
