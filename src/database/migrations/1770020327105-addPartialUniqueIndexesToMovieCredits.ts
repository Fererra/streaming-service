import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartialUniqueIndexesToMovieCredits1770020327105 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const actorRole = await queryRunner.query(
      `SELECT id FROM "credit_roles" WHERE "code" = 'ACTOR' LIMIT 1`,
    );

    const actorId = actorRole[0]?.id;

    if (!actorId) throw new Error('ACTOR role not found in credit_roles table');

    await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_non_actor_roles" 
        ON "movie_credits" ("movie_id", "person_id", "role_id") 
        WHERE "role_id" <> '${actorId}'
    `);

    await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_actor_roles" 
        ON "movie_credits" ("movie_id", "person_id", "character_name") 
        WHERE "role_id" = '${actorId}' AND "character_name" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX "UQ_non_actor_roles"
    `);

    await queryRunner.query(`
        DROP INDEX "UQ_actor_roles"
    `);
  }
}
