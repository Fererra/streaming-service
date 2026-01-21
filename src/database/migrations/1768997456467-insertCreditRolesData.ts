import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertCreditRolesData1768997456467 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO credit_roles(role) 
      VALUES 
        ('Actor'),
        ('Director'),
        ('Writer'),
        ('Producer'),
        ('Composer'),
        ('Cinematographer'),
        ('Editor')
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM credit_roles`);
  }
}
