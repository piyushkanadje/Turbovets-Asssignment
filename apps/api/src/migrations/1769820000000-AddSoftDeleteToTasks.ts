import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToTasks1769820000000 implements MigrationInterface {
  name = 'AddSoftDeleteToTasks1769820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" ADD "deleted_at" TIMESTAMP`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN "deleted_at"`
    );
  }
}
