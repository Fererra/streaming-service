import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertGenresData1768903861709 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO genres(name) 
      VALUES 
        ('Action'),
        ('Adventure'),
        ('Animation'),
        ('Comedy'),
        ('Crime'),
        ('Documentary'),
        ('Drama'),
        ('Family'),
        ('Fantasy'),
        ('History'),
        ('Horror'),
        ('Music'),
        ('Mystery'),
        ('Romance'),
        ('Science Fiction'),
        ('TV Movie'),
        ('Thriller'),
        ('War'),
        ('Western')
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM genres`);
  }
}
