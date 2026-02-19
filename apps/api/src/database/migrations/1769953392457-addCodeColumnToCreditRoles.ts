import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCodeColumnToCreditRoles1769953392457 implements MigrationInterface {
    name = 'AddCodeColumnToCreditRoles1769953392457'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credit_roles" ADD "code" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "credit_roles" ADD CONSTRAINT "UQ_70e593ce044577a65f93a804594" UNIQUE ("code")`);
        await queryRunner.query(`ALTER TABLE "credit_roles" DROP CONSTRAINT "UQ_d10d999cc35cde90200f1756257"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "credit_roles" ADD CONSTRAINT "UQ_d10d999cc35cde90200f1756257" UNIQUE ("role")`);
        await queryRunner.query(`ALTER TABLE "credit_roles" DROP CONSTRAINT "UQ_70e593ce044577a65f93a804594"`);
        await queryRunner.query(`ALTER TABLE "credit_roles" DROP COLUMN "code"`);
    }

}
