import { MigrationInterface, QueryRunner } from "typeorm";

export class StakedMetrics1739555049465 implements MigrationInterface {
    name = 'StakedMetrics1739555049465'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tvl_metrics" ADD "open_accounts" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" ADD "staked_share_histogram" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tvl_metrics" DROP COLUMN "staked_share_histogram"`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" DROP COLUMN "open_accounts"`);
    }

}
