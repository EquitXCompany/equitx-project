import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexEvents1753885646965 implements MigrationInterface {
    name = 'IndexEvents1753885646965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cdp_event" ("id" SERIAL NOT NULL, "contract_id" character varying(56) NOT NULL, "lender" character varying(56) NOT NULL, "xlm_deposited" numeric(30,0) NOT NULL, "asset_lent" numeric(30,0) NOT NULL, "status" "public"."cdp_event_status_enum" NOT NULL DEFAULT '0', "timestamp" bigint NOT NULL, "accrued_interest" numeric(30,0) NOT NULL, "interest_paid" numeric(30,0) NOT NULL, "last_interest_time" bigint NOT NULL, "ledger" integer NOT NULL, "event_id" character varying(32) NOT NULL, CONSTRAINT "UQ_9a762b11c4344704d49b7a15b7e" UNIQUE ("event_id"), CONSTRAINT "PK_21bdebd12bfe1465dc6f5cd79f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0cef95a9f834f8c61a2e2f1ecc" ON "cdp_event" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "indexer_state" ("id" SERIAL NOT NULL, "last_ledger" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_186a04c706e20d425992635168a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "liquidation_event" ("id" SERIAL NOT NULL, "contract_id" character varying(56) NOT NULL, "cdp_id" character varying(56) NOT NULL, "collateral_liquidated" numeric(30,0) NOT NULL, "principal_repaid" numeric(30,0) NOT NULL, "accrued_interest_repaid" numeric(30,0) NOT NULL, "collateral_applied_to_interest" numeric(30,0) NOT NULL, "collateralization_ratio" numeric(30,0) NOT NULL, "xlm_price" numeric(30,0) NOT NULL, "xasset_price" numeric(30,0) NOT NULL, "ledger" integer NOT NULL, "timestamp" bigint NOT NULL, "event_id" character varying(32) NOT NULL, CONSTRAINT "UQ_5f64da74d7cdd9fa2a787617150" UNIQUE ("event_id"), CONSTRAINT "PK_b81c20a3c0b565ceaf4491d66c9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2570e6677073084fa46f024e3d" ON "liquidation_event" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "stake_position_event" ("id" SERIAL NOT NULL, "contract_id" character varying(56) NOT NULL, "address" character varying(56) NOT NULL, "xasset_deposit" numeric(30,0) NOT NULL, "product_constant" bigint NOT NULL, "compounded_constant" bigint NOT NULL, "rewards_claimed" numeric(30,0) NOT NULL, "epoch" numeric(10,0) NOT NULL, "ledger" integer NOT NULL, "timestamp" bigint NOT NULL, "event_id" character varying(32) NOT NULL, CONSTRAINT "UQ_d762606a5b1ebb473f47944db74" UNIQUE ("event_id"), CONSTRAINT "PK_231cf04a49fd7b207d214369d97" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_93250baaee6188d639e828587b" ON "stake_position_event" ("timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_93250baaee6188d639e828587b"`);
        await queryRunner.query(`DROP TABLE "stake_position_event"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2570e6677073084fa46f024e3d"`);
        await queryRunner.query(`DROP TABLE "liquidation_event"`);
        await queryRunner.query(`DROP TABLE "indexer_state"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0cef95a9f834f8c61a2e2f1ecc"`);
        await queryRunner.query(`DROP TABLE "cdp_event"`);
    }

}
