import { MigrationInterface, QueryRunner } from "typeorm";

export class ProtocolGrowthTypes1739918069049 implements MigrationInterface {
    name = 'ProtocolGrowthTypes1739918069049'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "protocol_stats" ALTER COLUMN "user_growth_24h" TYPE numeric(15,5)`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ALTER COLUMN "tvl_growth_24h" TYPE numeric(15,5)`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ALTER COLUMN "volume_growth_24h" TYPE numeric(20,5)`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" ALTER COLUMN "open_accounts" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tvl_metrics" ALTER COLUMN "open_accounts" SET DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ALTER COLUMN "volume_growth_24h" TYPE numeric(10,5)`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ALTER COLUMN "tvl_growth_24h" TYPE numeric(10,5)`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ALTER COLUMN "user_growth_24h" TYPE numeric(10,5)`);
    }

}
