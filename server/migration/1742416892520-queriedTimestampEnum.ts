import { MigrationInterface, QueryRunner } from "typeorm";

export class QueriedTimestampEnum1742416892520 implements MigrationInterface {
    name = 'QueriedTimestampEnum1742416892520'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."last_queried_timestamps_table_type_enum" RENAME TO "last_queried_timestamps_table_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."last_queried_timestamps_table_type_enum" AS ENUM('CDP', 'STAKE', 'LIQUIDATION')`);
        await queryRunner.query(`ALTER TABLE "last_queried_timestamps" ALTER COLUMN "table_type" TYPE "public"."last_queried_timestamps_table_type_enum" USING "table_type"::"text"::"public"."last_queried_timestamps_table_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."last_queried_timestamps_table_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."cdp_history_action_enum" RENAME TO "cdp_history_action_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."cdp_history_action_enum" AS ENUM('OPEN', 'ADD_COLLATERAL', 'WITHDRAW_COLLATERAL', 'BORROW_ASSET', 'REPAY_DEBT', 'PAY_INTEREST', 'FREEZE', 'LIQUIDATE')`);
        await queryRunner.query(`ALTER TABLE "cdp_history" ALTER COLUMN "action" TYPE "public"."cdp_history_action_enum" USING "action"::"text"::"public"."cdp_history_action_enum"`);
        await queryRunner.query(`DROP TYPE "public"."cdp_history_action_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."cdp_history_action_enum_old" AS ENUM('OPEN', 'ADD_COLLATERAL', 'WITHDRAW_COLLATERAL', 'BORROW_ASSET', 'REPAY_DEBT', 'FREEZE', 'LIQUIDATE')`);
        await queryRunner.query(`ALTER TABLE "cdp_history" ALTER COLUMN "action" TYPE "public"."cdp_history_action_enum_old" USING "action"::"text"::"public"."cdp_history_action_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."cdp_history_action_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."cdp_history_action_enum_old" RENAME TO "cdp_history_action_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."last_queried_timestamps_table_type_enum_old" AS ENUM('CDP', 'STAKE')`);
        await queryRunner.query(`ALTER TABLE "last_queried_timestamps" ALTER COLUMN "table_type" TYPE "public"."last_queried_timestamps_table_type_enum_old" USING "table_type"::"text"::"public"."last_queried_timestamps_table_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."last_queried_timestamps_table_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."last_queried_timestamps_table_type_enum_old" RENAME TO "last_queried_timestamps_table_type_enum"`);
    }

}
