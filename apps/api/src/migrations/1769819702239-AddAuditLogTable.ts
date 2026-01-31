import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogTable1769819702239 implements MigrationInterface {
    name = 'AddAuditLogTable1769819702239'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "action" character varying(10) NOT NULL, "resource" character varying(255) NOT NULL, "organization_id" uuid, "details" jsonb, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_audit_timestamp" ON "audit_logs" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_user" ON "audit_logs" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_org" ON "audit_logs" ("organization_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_org"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_timestamp"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
    }

}
