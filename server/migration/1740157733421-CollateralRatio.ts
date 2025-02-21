import { MigrationInterface, QueryRunner } from "typeorm";

export class CollateralRatio1740157733421 implements MigrationInterface {
    name = 'CollateralRatio1740157733421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cdp_metrics" RENAME COLUMN "average_collateralization_ratio" TO "collateral_ratio"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cdp_metrics" RENAME COLUMN "collateral_ratio" TO "average_collateralization_ratio"`);
    }

}
