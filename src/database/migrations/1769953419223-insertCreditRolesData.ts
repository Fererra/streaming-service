import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertCreditRolesData1769953419223 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO credit_roles(code, role) 
      VALUES 
        ('ACTOR', 'Actor'),
        ('DIRECTOR', 'Director'),
        ('WRITER', 'Writer'),
        ('PRODUCER', 'Producer'),
        ('COMPOSER', 'Composer'),
        ('CINEMATOGRAPHER', 'Cinematographer'),
        ('EDITOR', 'Editor')
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM credit_roles`);
  }
}
