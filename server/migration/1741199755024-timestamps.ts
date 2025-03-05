import { MigrationInterface, QueryRunner } from "typeorm";

export class Timestamps1741199755024 implements MigrationInterface {
    name = 'Timestamps1741199755024'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cdps" ALTER COLUMN "created_at" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "cdps" ALTER COLUMN "updated_at" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "stakers" ALTER COLUMN "created_at" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "stakers" ALTER COLUMN "updated_at" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "cdp_history" ALTER COLUMN "timestamp" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "liquidations" ALTER COLUMN "timestamp" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "staker_history" ALTER COLUMN "timestamp" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "staker_history" ALTER COLUMN "timestamp" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "liquidations" ALTER COLUMN "timestamp" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "cdp_history" ALTER COLUMN "timestamp" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "stakers" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "stakers" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "cdps" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "cdps" ALTER COLUMN "created_at" SET DEFAULT now()`);
    }

}
