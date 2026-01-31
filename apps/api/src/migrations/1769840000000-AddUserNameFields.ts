import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNameFields1769840000000 implements MigrationInterface {
  name = 'AddUserNameFields1769840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add firstName column to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "firstName" character varying(100)
    `);

    // Add lastName column to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "lastName" character varying(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove lastName column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "lastName"
    `);

    // Remove firstName column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "firstName"
    `);
  }
}
