import { MigrationInterface, QueryRunner } from "typeorm";

export class PriceType1738084683191 implements MigrationInterface {
    name = 'PriceType1738084683191'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add temporary column
        await queryRunner.query(`ALTER TABLE "price_history" ADD "price_new" bigint`);
        await queryRunner.query(`ALTER TABLE "asset" ADD "price_new" bigint`);

        // Update existing rows with a default value (0 in this case)
        await queryRunner.query(`UPDATE "price_history" SET "price_new" = CAST(COALESCE(price, 0) AS bigint)`);
        await queryRunner.query(`UPDATE "asset" SET "price_new" = CAST(COALESCE(price, 0) AS bigint)`);

        // Drop old columns
        await queryRunner.query(`ALTER TABLE "price_history" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "price"`);

        // Rename new columns and add NOT NULL constraint
        await queryRunner.query(`ALTER TABLE "price_history" RENAME COLUMN "price_new" TO "price"`);
        await queryRunner.query(`ALTER TABLE "asset" RENAME COLUMN "price_new" TO "price"`);
        await queryRunner.query(`ALTER TABLE "price_history" ALTER COLUMN "price" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "price" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add temporary column
        await queryRunner.query(`ALTER TABLE "asset" ADD "price_old" numeric(18,8)`);
        await queryRunner.query(`ALTER TABLE "price_history" ADD "price_old" numeric(18,8)`);

        // Convert data back
        await queryRunner.query(`UPDATE "asset" SET "price_old" = CAST(price AS numeric(18,8))`);
        await queryRunner.query(`UPDATE "price_history" SET "price_old" = CAST(price AS numeric(18,8))`);

        // Drop new columns
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "price"`);
        await queryRunner.query(`ALTER TABLE "price_history" DROP COLUMN "price"`);

        // Rename old columns back and add NOT NULL constraint
        await queryRunner.query(`ALTER TABLE "asset" RENAME COLUMN "price_old" TO "price"`);
        await queryRunner.query(`ALTER TABLE "price_history" RENAME COLUMN "price_old" TO "price"`);
        await queryRunner.query(`ALTER TABLE "asset" ALTER COLUMN "price" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "price_history" ALTER COLUMN "price" SET NOT NULL`);
    }
}
