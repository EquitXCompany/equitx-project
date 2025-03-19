import { MigrationInterface, QueryRunner } from "typeorm";

export class AssetContract1742417380865 implements MigrationInterface {
    name = 'AssetContract1742417380865'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" ADD "contract_address" character varying(56)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "contract_address"`);
    }

}
