import { MigrationInterface, QueryRunner } from "typeorm";

export class MercuryWasm1745268105339 implements MigrationInterface {
    name = 'MercuryWasm1745268105339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liquidity_pools" ADD "mercury_wasm_hash" character varying(56)`); // Add column as nullable
        await queryRunner.query(`UPDATE "liquidity_pools" SET "mercury_wasm_hash" = '7e4be17c93fa942c9bae7230da8794a2'`); // Set default value for existing rows
        await queryRunner.query(`ALTER TABLE "liquidity_pools" ALTER COLUMN "mercury_wasm_hash" SET NOT NULL`); // Make column NOT NULL
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liquidity_pools" DROP COLUMN "mercury_wasm_hash"`);
    }

}
