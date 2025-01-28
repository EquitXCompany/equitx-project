import { MigrationInterface, QueryRunner } from "typeorm";

export class LastQueriedTimestamp1738100007459 implements MigrationInterface {
    name = 'LastQueriedTimestamp1738100007459'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type with specific values
        await queryRunner.query(`DO $$ BEGIN
            CREATE TYPE "public"."last_queried_timestamps_table_type_enum" AS ENUM ('CDP', 'STAKE');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;`);

        await queryRunner.query(`CREATE TABLE "last_queried_timestamps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "table_type" "public"."last_queried_timestamps_table_type_enum" NOT NULL, "timestamp" bigint NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "asset_id" uuid, CONSTRAINT "PK_2718dca04bb5fa303e63df9aa07" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "last_queried_timestamp"`);
        await queryRunner.query(`ALTER TABLE "last_queried_timestamps" ADD CONSTRAINT "FK_c8a7260e9eba8422054c3c57287" FOREIGN KEY ("asset_id") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "last_queried_timestamps" DROP CONSTRAINT "FK_c8a7260e9eba8422054c3c57287"`);
        await queryRunner.query(`ALTER TABLE "asset" ADD "last_queried_timestamp" bigint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`DROP TABLE "last_queried_timestamps"`);
        // Drop the enum type safely
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."last_queried_timestamps_table_type_enum"`);
    }
}
