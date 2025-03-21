import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1738860872806 implements MigrationInterface {
    name = 'InitialSchema1738860872806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DO $$ BEGIN
            CREATE TYPE "public"."cdps_status_enum" AS ENUM ('0', '1', '2', '3');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;`);
        await queryRunner.query(`DO $$ BEGIN
            CREATE TYPE "public"."last_queried_timestamps_table_type_enum" AS ENUM ('CDP', 'STAKE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;`);
        await queryRunner.query(`CREATE TABLE "cdps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lender" character(56) NOT NULL, "xlm_deposited" numeric(30,0) NOT NULL, "asset_lent" numeric(30,0) NOT NULL, "status" "public"."cdps_status_enum" NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "asset_id" uuid, CONSTRAINT "PK_766b98b2c5e557794660cb1042a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5f38e5c301a72e37764f66355c" ON "cdps" ("lender") `);
        await queryRunner.query(`CREATE INDEX "IDX_d8c8677fcaba2dd0631ddb3d1c" ON "cdps" ("asset_id") `);
        await queryRunner.query(`CREATE TABLE "liquidity_pools" ("asset_id" uuid NOT NULL, "pool_address" character varying(56) NOT NULL, "minimum_collateralization_ratio" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_0e9c01f404f36d69a66360da963" PRIMARY KEY ("asset_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_66d0177919f16b48f6a8e3d968" ON "liquidity_pools" ("pool_address") `);
        await queryRunner.query(`CREATE TABLE "stakers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying(56) NOT NULL, "xasset_deposit" numeric(30,0) NOT NULL, "product_constant" bigint NOT NULL, "compounded_constant" bigint NOT NULL, "epoch" numeric(10,0) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "asset_id" uuid, CONSTRAINT "PK_3da4a784c61e62ade7612c317e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_567d0f033a43cd6faefa62831f" ON "stakers" ("address") `);
        await queryRunner.query(`CREATE TABLE "singletons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(255) NOT NULL, "value" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "asset_id" uuid, CONSTRAINT "PK_4228e3294dfb966dc99eb20de3f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_96a84a7b00108d9cfb0e87f4e6" ON "singletons" ("key") `);
        await queryRunner.query(`CREATE INDEX "IDX_bdb5015d1fd9f4a13e4bc27440" ON "singletons" ("asset_id") `);
        await queryRunner.query(`CREATE TABLE "price_history" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP NOT NULL, "price" numeric(30,0) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "is_latest" boolean NOT NULL DEFAULT false, "asset_id" uuid, CONSTRAINT "PK_e41e25472373d4b574b153229e9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_289db4cdf9022df4eafc0a09cf" ON "price_history" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_3485ea7b6ca7303962a159252a" ON "price_history" ("is_latest") `);
        await queryRunner.query(`CREATE TABLE "asset" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "symbol" character varying(10) NOT NULL, "feed_address" character varying(56) NOT NULL, "price" numeric(30,0) NOT NULL, "last_xlm_price" numeric(30,0) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_1209d107fe21482beaea51b745e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_45b83954906fc214e750ba5328" ON "asset" ("symbol") `);
        await queryRunner.query(`CREATE TABLE "last_queried_timestamps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "wasm_hash" character varying(32) NOT NULL, "table_type" "public"."last_queried_timestamps_table_type_enum" NOT NULL, "timestamp" bigint NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2718dca04bb5fa303e63df9aa07" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "cdps" ADD CONSTRAINT "FK_d8c8677fcaba2dd0631ddb3d1cb" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidity_pools" ADD CONSTRAINT "FK_0e9c01f404f36d69a66360da963" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stakers" ADD CONSTRAINT "FK_c3c82793720b3a3400cfc50c7b9" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "singletons" ADD CONSTRAINT "FK_bdb5015d1fd9f4a13e4bc27440b" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "price_history" ADD CONSTRAINT "FK_db9d97d03fe07d465c3fdf6f078" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "price_history" DROP CONSTRAINT "FK_db9d97d03fe07d465c3fdf6f078"`);
        await queryRunner.query(`ALTER TABLE "singletons" DROP CONSTRAINT "FK_bdb5015d1fd9f4a13e4bc27440b"`);
        await queryRunner.query(`ALTER TABLE "stakers" DROP CONSTRAINT "FK_c3c82793720b3a3400cfc50c7b9"`);
        await queryRunner.query(`ALTER TABLE "liquidity_pools" DROP CONSTRAINT "FK_0e9c01f404f36d69a66360da963"`);
        await queryRunner.query(`ALTER TABLE "cdps" DROP CONSTRAINT "FK_d8c8677fcaba2dd0631ddb3d1cb"`);
        await queryRunner.query(`DROP TABLE "last_queried_timestamps"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_45b83954906fc214e750ba5328"`);
        await queryRunner.query(`DROP TABLE "asset"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3485ea7b6ca7303962a159252a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_289db4cdf9022df4eafc0a09cf"`);
        await queryRunner.query(`DROP TABLE "price_history"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bdb5015d1fd9f4a13e4bc27440"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_96a84a7b00108d9cfb0e87f4e6"`);
        await queryRunner.query(`DROP TABLE "singletons"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_567d0f033a43cd6faefa62831f"`);
        await queryRunner.query(`DROP TABLE "stakers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_66d0177919f16b48f6a8e3d968"`);
        await queryRunner.query(`DROP TABLE "liquidity_pools"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d8c8677fcaba2dd0631ddb3d1c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5f38e5c301a72e37764f66355c"`);
        await queryRunner.query(`DROP TABLE "cdps"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."last_queried_timestamps_table_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."cdps_status_enum"`);
    }

}
