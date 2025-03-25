import { MigrationInterface, QueryRunner } from "typeorm";

export class AssetPoolAddress1742926120231 implements MigrationInterface {
    name = 'AssetPoolAddress1742926120231'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" RENAME COLUMN "contract_address" TO "pool_address"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" RENAME COLUMN "pool_address" TO "contract_address"`);
    }

}
