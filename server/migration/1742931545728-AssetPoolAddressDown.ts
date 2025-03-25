import { MigrationInterface, QueryRunner } from "typeorm";

export class AssetPoolAddressDown1742931545728 implements MigrationInterface {
    name = 'AssetPoolAddressDown1742931545728'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "pool_address"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" ADD "pool_address" character varying(56)`);
    }

}
