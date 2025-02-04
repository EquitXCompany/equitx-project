import { MigrationInterface, QueryRunner } from "typeorm";

export class XlmPrice1738615923955 implements MigrationInterface {
    name = 'XlmPrice1738615923955'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" ADD "last_xlm_price" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "last_xlm_price"`);
    }

}
