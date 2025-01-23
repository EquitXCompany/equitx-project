import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1737669933582 implements MigrationInterface {
    name = 'InitialSchema1737669933582'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."cdp_status_enum" AS ENUM('0', '1', '2', '3')`);
        await queryRunner.query(`CREATE TABLE "cdp" ("address" character(56) NOT NULL, "xlm_deposited" bigint NOT NULL, "asset_lent" bigint NOT NULL, "status" "public"."cdp_status_enum" NOT NULL DEFAULT '0', "asset_symbol" character varying(10), CONSTRAINT "PK_4cd53a029b342057e140d623d4e" PRIMARY KEY ("address"))`);
        await queryRunner.query(`CREATE TABLE "liquidity_pool" ("pool_address" character varying(255) NOT NULL, "asset_symbol" character varying(10), CONSTRAINT "PK_a8bedc7ab55727a6289c590c933" PRIMARY KEY ("pool_address"))`);
        await queryRunner.query(`CREATE TABLE "pricefeed" ("timestamp" TIMESTAMP NOT NULL, "price" numeric(18,8) NOT NULL, "asset_symbol" character varying(10), CONSTRAINT "PK_980c3444793827dd812a360c0aa" PRIMARY KEY ("timestamp"))`);
        await queryRunner.query(`CREATE TABLE "staker" ("address" character varying(56) NOT NULL, "xasset_deposit" bigint NOT NULL, "product_constant" bigint NOT NULL, "compounded_constant" bigint NOT NULL, "epoch" bigint NOT NULL, "asset_symbol" character varying(10), CONSTRAINT "PK_2b2b9093e0fca7f90299235ab47" PRIMARY KEY ("address"))`);
        await queryRunner.query(`CREATE TABLE "singletons" ("key" character varying(255) NOT NULL, "value" text NOT NULL, "asset_symbol" character varying(10), CONSTRAINT "PK_96a84a7b00108d9cfb0e87f4e6f" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "asset" ("symbol" character varying(10) NOT NULL, "asset_type" character varying(255) NOT NULL, "address" character varying(255) NOT NULL, CONSTRAINT "PK_45b83954906fc214e750ba53286" PRIMARY KEY ("symbol"))`);
        await queryRunner.query(`CREATE TABLE "last_queried_timestamp" ("asset_symbol" character varying(10) NOT NULL, "timestamp" bigint NOT NULL, CONSTRAINT "PK_e8fd94d769336d69110b1e352fb" PRIMARY KEY ("asset_symbol"))`);
        await queryRunner.query(`ALTER TABLE "cdp" ADD CONSTRAINT "FK_53e3a062b862f967ddc4aa8415b" FOREIGN KEY ("asset_symbol") REFERENCES "asset"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "liquidity_pool" ADD CONSTRAINT "FK_459a9533afbb3bff7e43ee3da4e" FOREIGN KEY ("asset_symbol") REFERENCES "asset"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pricefeed" ADD CONSTRAINT "FK_4e409bb6b2392ef06974411a499" FOREIGN KEY ("asset_symbol") REFERENCES "asset"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staker" ADD CONSTRAINT "FK_78a0ce96789f2ed2a7704715eac" FOREIGN KEY ("asset_symbol") REFERENCES "asset"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "singletons" ADD CONSTRAINT "FK_052eba29d91bc6f6526d2747fe2" FOREIGN KEY ("asset_symbol") REFERENCES "asset"("symbol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "singletons" DROP CONSTRAINT "FK_052eba29d91bc6f6526d2747fe2"`);
        await queryRunner.query(`ALTER TABLE "staker" DROP CONSTRAINT "FK_78a0ce96789f2ed2a7704715eac"`);
        await queryRunner.query(`ALTER TABLE "pricefeed" DROP CONSTRAINT "FK_4e409bb6b2392ef06974411a499"`);
        await queryRunner.query(`ALTER TABLE "liquidity_pool" DROP CONSTRAINT "FK_459a9533afbb3bff7e43ee3da4e"`);
        await queryRunner.query(`ALTER TABLE "cdp" DROP CONSTRAINT "FK_53e3a062b862f967ddc4aa8415b"`);
        await queryRunner.query(`DROP TABLE "last_queried_timestamp"`);
        await queryRunner.query(`DROP TABLE "asset"`);
        await queryRunner.query(`DROP TABLE "singletons"`);
        await queryRunner.query(`DROP TABLE "staker"`);
        await queryRunner.query(`DROP TABLE "pricefeed"`);
        await queryRunner.query(`DROP TABLE "liquidity_pool"`);
        await queryRunner.query(`DROP TABLE "cdp"`);
        await queryRunner.query(`DROP TYPE "public"."cdp_status_enum"`);
    }

}
