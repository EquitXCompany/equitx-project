import { MigrationInterface, QueryRunner } from "typeorm";

export class Analytics1739289022447 implements MigrationInterface {
    name = 'Analytics1739289022447'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."cdp_history_action_enum" AS ENUM('OPEN', 'ADD_COLLATERAL', 'WITHDRAW_COLLATERAL', 'BORROW_ASSET', 'REPAY_DEBT', 'FREEZE', 'LIQUIDATE');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staker_history_action_enum" AS ENUM('STAKE', 'UNSTAKE', 'DEPOSIT', 'WITHDRAW', 'CLAIM_REWARDS');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`CREATE TABLE "cdp_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lender" character(56) NOT NULL, "xlm_deposited" numeric(30,0) NOT NULL, "asset_lent" numeric(30,0) NOT NULL, "xlm_delta" numeric(30,0) NOT NULL DEFAULT '0', "asset_delta" numeric(30,0) NOT NULL DEFAULT '0', "action" "public"."cdp_history_action_enum" NOT NULL, "original_cdp_id" uuid NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid, CONSTRAINT "PK_36bec318f5ad9248b3f563500e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2a41cbf544a11add9e45fe8256" ON "cdp_history" ("lender") `);
        await queryRunner.query(`CREATE INDEX "IDX_715be056834a4b7de88819ad64" ON "cdp_history" ("asset_id") `);
        await queryRunner.query(`CREATE TABLE "cdp_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "active_cdps_count" integer NOT NULL, "total_xlm_locked" numeric(30,0) NOT NULL, "average_collateralization_ratio" numeric(15,5) NOT NULL, "cdps_near_liquidation" integer NOT NULL, "recent_liquidations" integer NOT NULL, "health_score" integer NOT NULL, "daily_volume" numeric(30,0) NOT NULL, "weekly_volume" numeric(30,0) NOT NULL, "monthly_volume" numeric(30,0) NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid, CONSTRAINT "PK_dbb8826aaf9e22a9c07be0a53c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c62bf82e3d13bd8b95e6466c63" ON "cdp_metrics" ("asset_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5426ecc57791f110e10165fe7a" ON "cdp_metrics" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "liquidations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "xlm_liquidated" numeric(30,0) NOT NULL, "debt_covered" numeric(30,0) NOT NULL, "collateralization_ratio" numeric(30,0) NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "cdp_id" uuid, "asset_id" uuid, CONSTRAINT "PK_2beac231b5ead3f70f2f6347a08" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "protocol_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "total_value_locked" numeric(30,0) NOT NULL, "total_debt" numeric(30,0) NOT NULL, "unique_users" integer NOT NULL, "active_cdps" integer NOT NULL, "system_collateralization" numeric(10,5) NOT NULL, "liquidation_events_24h" integer NOT NULL, "average_health_factor" numeric(10,5) NOT NULL, "daily_volume" numeric(30,0) NOT NULL, "cumulative_volume" numeric(30,0) NOT NULL, "fees_24h" numeric(30,0) NOT NULL, "user_growth_24h" numeric(10,5) NOT NULL, "tvl_growth_24h" numeric(10,5) NOT NULL, "volume_growth_24h" numeric(10,5) NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "is_latest" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_01e3138597f447eaa59bc2bcf9c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a9e225567f904e644d0b109cc5" ON "protocol_stats" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "staker_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character(56) NOT NULL, "xasset_deposit" numeric(30,0) NOT NULL, "product_constant" numeric(30,0) NOT NULL, "compounded_constant" numeric(30,0) NOT NULL, "xasset_delta" numeric(30,0) NOT NULL DEFAULT '0', "rewards_claimed" numeric(30,0) NOT NULL DEFAULT '0', "action" "public"."staker_history_action_enum" NOT NULL, "epoch" character varying NOT NULL, "original_staker_id" uuid NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid, CONSTRAINT "PK_828313a7140ceb82ad5bbd68648" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0dd87c935b43fe8adc1f11338b" ON "staker_history" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_2ac747f4ff981c1721a9704848" ON "staker_history" ("asset_id") `);
        await queryRunner.query(`CREATE TABLE "tvl_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "total_xlm_locked" numeric(30,0) NOT NULL, "total_xassets_minted" numeric(30,0) NOT NULL, "active_cdps_count" integer NOT NULL, "tvl_usd" numeric(30,0) NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid, CONSTRAINT "PK_3f24d5bbc2956cd7f62502b51c5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_40eca242928cb1465111bdcee9" ON "tvl_metrics" ("asset_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1685e49f43a80ed131890e5f27" ON "tvl_metrics" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "user_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying(56) NOT NULL, "total_cdps" integer NOT NULL, "total_value_locked" numeric(30,0) NOT NULL, "total_debt" numeric(30,0) NOT NULL, "avg_collateralization_ratio" numeric(15,5) NOT NULL, "total_volume" numeric(30,0) NOT NULL, "liquidations_received" integer NOT NULL, "liquidations_executed" integer NOT NULL, "risk_score" integer NOT NULL, "last_activity" TIMESTAMP NOT NULL, "avg_position_duration" integer NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_987f8bd3fd2015b1c617b06b1cd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a304adc800499aad883fa0d99f" ON "user_metrics" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_65537c1d67d0a37e773df926e5" ON "user_metrics" ("timestamp") `);
        await queryRunner.query(`CREATE TABLE "utilization_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "daily_active_users" integer NOT NULL, "daily_transactions" integer NOT NULL, "daily_xlm_volume" numeric(30,0) NOT NULL, "daily_xasset_volume" numeric(30,0) NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid, CONSTRAINT "PK_93dc3941af91e57f5c4ef494c94" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_429b102b19712dafefc49aa5b6" ON "utilization_metrics" ("asset_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c3c96255a0ac4c5f6bb9b0bf0c" ON "utilization_metrics" ("timestamp") `);
        await queryRunner.query(`ALTER TABLE "stakers" ADD "total_rewards_claimed" numeric(30,0) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "cdp_history" ADD CONSTRAINT "FK_715be056834a4b7de88819ad64a" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cdp_metrics" ADD CONSTRAINT "FK_c62bf82e3d13bd8b95e6466c639" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD CONSTRAINT "FK_ec5533c2bb1fd262245c02f6462" FOREIGN KEY ("cdp_id") REFERENCES "cdps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidations" ADD CONSTRAINT "FK_6108b94908d9b575d47de7130f9" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staker_history" ADD CONSTRAINT "FK_2ac747f4ff981c1721a97048486" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" ADD CONSTRAINT "FK_40eca242928cb1465111bdcee92" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "utilization_metrics" ADD CONSTRAINT "FK_429b102b19712dafefc49aa5b61" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "utilization_metrics" DROP CONSTRAINT "FK_429b102b19712dafefc49aa5b61"`);
        await queryRunner.query(`ALTER TABLE "tvl_metrics" DROP CONSTRAINT "FK_40eca242928cb1465111bdcee92"`);
        await queryRunner.query(`ALTER TABLE "staker_history" DROP CONSTRAINT "FK_2ac747f4ff981c1721a97048486"`);
        await queryRunner.query(`ALTER TABLE "liquidations" DROP CONSTRAINT "FK_6108b94908d9b575d47de7130f9"`);
        await queryRunner.query(`ALTER TABLE "liquidations" DROP CONSTRAINT "FK_ec5533c2bb1fd262245c02f6462"`);
        await queryRunner.query(`ALTER TABLE "cdp_metrics" DROP CONSTRAINT "FK_c62bf82e3d13bd8b95e6466c639"`);
        await queryRunner.query(`ALTER TABLE "cdp_history" DROP CONSTRAINT "FK_715be056834a4b7de88819ad64a"`);
        await queryRunner.query(`ALTER TABLE "stakers" DROP COLUMN "total_rewards_claimed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c3c96255a0ac4c5f6bb9b0bf0c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_429b102b19712dafefc49aa5b6"`);
        await queryRunner.query(`DROP TABLE "utilization_metrics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_65537c1d67d0a37e773df926e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a304adc800499aad883fa0d99f"`);
        await queryRunner.query(`DROP TABLE "user_metrics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1685e49f43a80ed131890e5f27"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40eca242928cb1465111bdcee9"`);
        await queryRunner.query(`DROP TABLE "tvl_metrics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2ac747f4ff981c1721a9704848"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0dd87c935b43fe8adc1f11338b"`);
        await queryRunner.query(`DROP TABLE "staker_history"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9e225567f904e644d0b109cc5"`);
        await queryRunner.query(`DROP TABLE "protocol_stats"`);
        await queryRunner.query(`DROP TABLE "liquidations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5426ecc57791f110e10165fe7a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c62bf82e3d13bd8b95e6466c63"`);
        await queryRunner.query(`DROP TABLE "cdp_metrics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_715be056834a4b7de88819ad64"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2a41cbf544a11add9e45fe8256"`);
        await queryRunner.query(`DROP TABLE "cdp_history"`);
        await queryRunner.query(`
            DO $$ BEGIN
                DROP TYPE IF EXISTS "public"."cdp_history_action_enum";
            EXCEPTION WHEN others THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                DROP TYPE IF EXISTS "public"."staker_history_action_enum";
            EXCEPTION WHEN others THEN null;
            END $$;
        `);
    }

}
