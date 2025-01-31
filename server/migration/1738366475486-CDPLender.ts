import { MigrationInterface, QueryRunner } from "typeorm";

export class CDPLender1738366475486 implements MigrationInterface {
    name = 'CDPLender1738366475486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_6a90f914124f01984b65d1c5b7"`);
        await queryRunner.query(`ALTER TABLE "cdps" RENAME COLUMN "address" TO "lender"`);
        await queryRunner.query(`CREATE INDEX "IDX_5f38e5c301a72e37764f66355c" ON "cdps" ("lender") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5f38e5c301a72e37764f66355c"`);
        await queryRunner.query(`ALTER TABLE "cdps" RENAME COLUMN "lender" TO "address"`);
        await queryRunner.query(`CREATE INDEX "IDX_6a90f914124f01984b65d1c5b7" ON "cdps" ("address") `);
    }

}
