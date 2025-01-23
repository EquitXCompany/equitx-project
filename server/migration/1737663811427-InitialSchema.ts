import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1737663811427 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "asset" (
                "symbol" varchar(10) PRIMARY KEY,
                "asset_type" varchar(255) NOT NULL,
                "address" varchar(255) NOT NULL
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "cdp" (
                "address" char(56) PRIMARY KEY,
                "xlm_deposited" bigint NOT NULL,
                "asset_lent" bigint NOT NULL,
                "status" enum('0', '1', '2', '3') NOT NULL DEFAULT '0',
                "asset_symbol" varchar(10),
                FOREIGN KEY ("asset_symbol") REFERENCES "asset" ("symbol")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "last_queried_timestamp" (
                "asset_symbol" varchar(10) PRIMARY KEY,
                "timestamp" bigint NOT NULL
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "liquidity_pool" (
                "pool_address" varchar(255) PRIMARY KEY,
                "asset_symbol" varchar(10),
                FOREIGN KEY ("asset_symbol") REFERENCES "asset" ("symbol")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "pricefeed" (
                "timestamp" timestamp PRIMARY KEY,
                "price" decimal(18,8) NOT NULL,
                "asset_symbol" varchar(10),
                FOREIGN KEY ("asset_symbol") REFERENCES "asset" ("symbol")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "singletons" (
                "key" varchar(255) PRIMARY KEY,
                "value" text NOT NULL,
                "asset_symbol" varchar(10),
                FOREIGN KEY ("asset_symbol") REFERENCES "asset" ("symbol")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "staker" (
                "address" varchar(56) PRIMARY KEY,
                "xasset_deposit" bigint NOT NULL,
                "product_constant" bigint NOT NULL,
                "compounded_constant" bigint NOT NULL,
                "epoch" bigint NOT NULL,
                "asset_symbol" varchar(10),
                FOREIGN KEY ("asset_symbol") REFERENCES "asset" ("symbol")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "staker"`);
        await queryRunner.query(`DROP TABLE "singletons"`);
        await queryRunner.query(`DROP TABLE "pricefeed"`);
        await queryRunner.query(`DROP TABLE "liquidity_pool"`);
        await queryRunner.query(`DROP TABLE "last_queried_timestamp"`);
        await queryRunner.query(`DROP TABLE "cdp"`);
        await queryRunner.query(`DROP TABLE "asset"`);
    }

}
