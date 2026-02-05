import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimestampsToMovies1770037913920 implements MigrationInterface {
  name = 'AddTimestampsToMovies1770037913920';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "movies" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "movies" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "movies" ADD "deleted_at" TIMESTAMP`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "movies" DROP COLUMN "created_at"`);
  }
}
