import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769807535964 implements MigrationInterface {
    name = 'InitialSchema1769807535964'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text, "organization_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_task_org" ON "tasks" ("organization_id") `);
        await queryRunner.query(`CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "parent_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_org_parent" ON "organizations" ("parent_id") `);
        await queryRunner.query(`CREATE TYPE "public"."user_organizations_role_enum" AS ENUM('OWNER', 'ADMIN', 'VIEWER')`);
        await queryRunner.query(`CREATE TABLE "user_organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "organization_id" uuid NOT NULL, "role" "public"."user_organizations_role_enum" NOT NULL DEFAULT 'VIEWER', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "uq_user_org" UNIQUE ("user_id", "organization_id"), CONSTRAINT "PK_51ed3f60fdf013ee5041d2d4d3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_org_org" ON "user_organizations" ("organization_id") `);
        await queryRunner.query(`CREATE INDEX "idx_user_org_user" ON "user_organizations" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_email" ON "users" ("email") `);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_44a9b5209cdfd6f72fb09a7c994" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organizations" ADD CONSTRAINT "FK_f3a7c9411eaa5f9cbc5363de331" FOREIGN KEY ("parent_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_organizations" ADD CONSTRAINT "FK_6881b23cd1a8924e4bf61515fbb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_organizations" ADD CONSTRAINT "FK_9dae16cdea66aeba1eb6f6ddf29" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_9dae16cdea66aeba1eb6f6ddf29"`);
        await queryRunner.query(`ALTER TABLE "user_organizations" DROP CONSTRAINT "FK_6881b23cd1a8924e4bf61515fbb"`);
        await queryRunner.query(`ALTER TABLE "organizations" DROP CONSTRAINT "FK_f3a7c9411eaa5f9cbc5363de331"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_44a9b5209cdfd6f72fb09a7c994"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_email"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_org_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_org_org"`);
        await queryRunner.query(`DROP TABLE "user_organizations"`);
        await queryRunner.query(`DROP TYPE "public"."user_organizations_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_org_parent"`);
        await queryRunner.query(`DROP TABLE "organizations"`);
        await queryRunner.query(`DROP INDEX "public"."idx_task_org"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
    }

}
