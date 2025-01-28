import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAssetPrice1738078212746 implements MigrationInterface {
    name = 'UpdateAssetPrice1738078212746'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liquidity_pools" ADD "minimum_collateralization_ratio" numeric(10,2)`);
        await queryRunner.query(`UPDATE "liquidity_pools" SET "minimum_collateralization_ratio" = 120.00`);
        await queryRunner.query(`ALTER TABLE "liquidity_pools" ALTER COLUMN "minimum_collateralization_ratio" SET NOT NULL`);
        
        await queryRunner.query(`ALTER TABLE "asset" ADD "price" numeric(18,8)`);
        await queryRunner.query(`UPDATE "asset" SET "price" = 1.00000000`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "price" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "liquidity_pools" DROP COLUMN "minimum_collateralization_ratio"`);
    }

}
