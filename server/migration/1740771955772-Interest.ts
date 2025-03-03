import { MigrationInterface, QueryRunner } from "typeorm";

export class Interest1740771955772 implements MigrationInterface {
    name = 'Interest1740771955772'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liquidations" RENAME COLUMN "xlm_liquidated" TO "collateral_liquidated"`);
        await queryRunner.query(`ALTER TABLE "liquidations" RENAME COLUMN "debt_covered" TO "principal_repaid"`);
        await queryRunner.query(`ALTER TABLE "liquidations" RENAME COLUMN "xlm_liquidated_usd" TO "collateral_liquidated_usd"`);
        await queryRunner.query(`ALTER TABLE "cdps" ADD "accrued_interest" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdps" ADD "interest_paid" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdps" ADD "last_interest_time" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdp_history" ADD "interest_delta" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdp_history" ADD "accrued_interest" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdp_history" ADD "interest_paid" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdp_metrics" ADD "total_outstanding_interest" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdp_metrics" ADD "total_paid_interest" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD "accrued_interest_repaid" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD "collateral_applied_to_interest" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ADD "total_outstanding_interest" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" ADD "total_paid_interest" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user_metrics" ADD "total_accrued_interest" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_metrics" ADD "total_interest_paid" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD "xlm_price" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD "xasset_price" numeric(30,0) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liquidations" RENAME COLUMN "collateral_liquidated" TO "xlm_liquidated"`);
        await queryRunner.query(`ALTER TABLE "liquidations" RENAME COLUMN "principal_repaid" TO "debt_covered"`);
        await queryRunner.query(`ALTER TABLE "liquidations" RENAME COLUMN "collateral_liquidated_usd" TO "xlm_liquidated_usd"`);
        await queryRunner.query(`ALTER TABLE "user_metrics" DROP COLUMN "total_interest_paid"`);
        await queryRunner.query(`ALTER TABLE "user_metrics" DROP COLUMN "total_accrued_interest"`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" DROP COLUMN "total_paid_interest"`);
        await queryRunner.query(`ALTER TABLE "protocol_stats" DROP COLUMN "total_outstanding_interest"`);
        await queryRunner.query(`ALTER TABLE "liquidations" DROP COLUMN "collateral_applied_to_interest"`);
        await queryRunner.query(`ALTER TABLE "liquidations" DROP COLUMN "accrued_interest_repaid"`);
        await queryRunner.query(`ALTER TABLE "cdp_metrics" DROP COLUMN "total_paid_interest"`);
        await queryRunner.query(`ALTER TABLE "cdp_metrics" DROP COLUMN "total_outstanding_interest"`);
        await queryRunner.query(`ALTER TABLE "cdp_history" DROP COLUMN "interest_paid"`);
        await queryRunner.query(`ALTER TABLE "cdp_history" DROP COLUMN "accrued_interest"`);
        await queryRunner.query(`ALTER TABLE "cdp_history" DROP COLUMN "interest_delta"`);
        await queryRunner.query(`ALTER TABLE "cdps" DROP COLUMN "last_interest_time"`);
        await queryRunner.query(`ALTER TABLE "cdps" DROP COLUMN "interest_paid"`);
        await queryRunner.query(`ALTER TABLE "cdps" DROP COLUMN "accrued_interest"`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD "xlm_liquidated_usd" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD "debt_covered" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD "xlm_liquidated" numeric(30,0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "liquidations" DROP COLUMN "xasset_price"`);
        await queryRunner.query(`ALTER TABLE "liquidations" DROP COLUMN "xlm_price"`);
    }

}
