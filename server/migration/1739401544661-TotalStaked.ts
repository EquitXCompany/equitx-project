import { MigrationInterface, QueryRunner } from "typeorm";

export class TotalStaked1739401544661 implements MigrationInterface {
    name = 'TotalStaked1739401544661'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "protocol_stats" DROP COLUMN "fees_24h"`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" DROP COLUMN "cumulative_volume"`);
        await queryRunner.query(`ALTER TABLE "cdp_metrics" ADD "collateral_ratio_histogram" jsonb`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD "xlm_liquidated_usd" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ADD "total_staked" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" ADD "total_xassets_minted_usd" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" ADD "total_xassets_staked" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" ADD "total_xassets_staked_usd" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ALTER COLUMN "system_collateralization" TYPE numeric(12,5)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "protocol_stats" ALTER COLUMN "system_collateralization" TYPE numeric(10,5)`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" DROP COLUMN "total_xassets_staked_usd"`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" DROP COLUMN "total_xassets_staked"`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" DROP COLUMN "total_xassets_minted_usd"`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" DROP COLUMN "total_staked"`);
        await queryRunner.query(`ALTER TABLE "liquidations" DROP COLUMN "xlm_liquidated_usd"`);
        await queryRunner.query(`ALTER TABLE "cdp_metrics" DROP COLUMN "collateral_ratio_histogram"`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ADD "cumulative_volume" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ADD "fees_24h" numeric(30,0) NOT NULL DEFAULT '0'`);
    }

}
