import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveHash1753898238447 implements MigrationInterface {
    name = 'RemoveHash1753898238447'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "liquidity_pools" DROP COLUMN "mercury_wasm_hash"`);
        await queryRunner.query(`ALTER TABLE "last_queried_timestamps" DROP COLUMN "wasm_hash"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "last_queried_timestamps" ADD "wasm_hash" character varying(32) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "liquidity_pools" ADD "mercury_wasm_hash" character varying(56) NOT NULL`);
    }

}
