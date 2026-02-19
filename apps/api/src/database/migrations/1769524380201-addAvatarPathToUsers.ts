import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarPathToUsers1769524380201 implements MigrationInterface {
    name = 'AddAvatarPathToUsers1769524380201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar_path" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_path"`);
    }

}
