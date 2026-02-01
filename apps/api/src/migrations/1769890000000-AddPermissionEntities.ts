import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermissionEntities1769890000000 implements MigrationInterface {
  name = 'AddPermissionEntities1769890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "public"."permissions_resource_enum" AS ENUM('TASK', 'ORGANIZATION', 'MEMBER', 'AUDIT_LOG', 'INVITATION')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."permissions_action_enum" AS ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'RESTORE', 'INVITE', 'MANAGE')
    `);

    // Create permissions table
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        "resource" "public"."permissions_resource_enum" NOT NULL,
        "action" "public"."permissions_action_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_permission_resource_action" UNIQUE ("resource", "action"),
        CONSTRAINT "pk_permissions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_permission_resource" ON "permissions" ("resource")
    `);

    // Create role_permissions table
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "role" "public"."user_organizations_role_enum" NOT NULL,
        "permission_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_role_permission" UNIQUE ("role", "permission_id"),
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_role_permission_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_role_permission_role" ON "role_permissions" ("role")
    `);

    // Create user_permissions table for user-level overrides
    await queryRunner.query(`
      CREATE TABLE "user_permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        "granted" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_user_org_permission" UNIQUE ("user_id", "organization_id", "permission_id"),
        CONSTRAINT "pk_user_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_user_permission_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_permission_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_permission_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_permission_user_org" ON "user_permissions" ("user_id", "organization_id")
    `);

    // Seed default permissions
    const permissions = [
      // Task permissions
      { name: 'Create Tasks', description: 'Create new tasks in the organization', resource: 'TASK', action: 'CREATE' },
      { name: 'Read Tasks', description: 'View tasks in the organization', resource: 'TASK', action: 'READ' },
      { name: 'Update Tasks', description: 'Edit existing tasks', resource: 'TASK', action: 'UPDATE' },
      { name: 'Delete Tasks', description: 'Delete tasks (soft delete)', resource: 'TASK', action: 'DELETE' },
      { name: 'Restore Tasks', description: 'Restore soft-deleted tasks', resource: 'TASK', action: 'RESTORE' },
      
      // Organization permissions
      { name: 'Read Organization', description: 'View organization details', resource: 'ORGANIZATION', action: 'READ' },
      { name: 'Update Organization', description: 'Edit organization settings', resource: 'ORGANIZATION', action: 'UPDATE' },
      { name: 'Delete Organization', description: 'Delete the organization', resource: 'ORGANIZATION', action: 'DELETE' },
      { name: 'Manage Organization', description: 'Full organization management', resource: 'ORGANIZATION', action: 'MANAGE' },
      
      // Member permissions
      { name: 'Read Members', description: 'View organization members', resource: 'MEMBER', action: 'READ' },
      { name: 'Update Members', description: 'Change member roles', resource: 'MEMBER', action: 'UPDATE' },
      { name: 'Delete Members', description: 'Remove members from organization', resource: 'MEMBER', action: 'DELETE' },
      { name: 'Invite Members', description: 'Invite new members', resource: 'MEMBER', action: 'INVITE' },
      
      // Audit log permissions
      { name: 'Read Audit Logs', description: 'View audit logs', resource: 'AUDIT_LOG', action: 'READ' },
      
      // Invitation permissions
      { name: 'Create Invitations', description: 'Create new invitations', resource: 'INVITATION', action: 'CREATE' },
      { name: 'Read Invitations', description: 'View invitations', resource: 'INVITATION', action: 'READ' },
      { name: 'Delete Invitations', description: 'Cancel/delete invitations', resource: 'INVITATION', action: 'DELETE' },
    ];

    // Insert permissions
    for (const perm of permissions) {
      await queryRunner.query(`
        INSERT INTO "permissions" ("name", "description", "resource", "action")
        VALUES ('${perm.name}', '${perm.description}', '${perm.resource}', '${perm.action}')
      `);
    }

    // Get permission IDs for role mapping
    const permissionRows = await queryRunner.query(`SELECT id, resource, action FROM "permissions"`);
    const permMap = new Map<string, string>();
    for (const row of permissionRows) {
      permMap.set(`${row.resource}:${row.action}`, row.id);
    }

    // Define role-permission mappings
    // OWNER: All permissions
    // ADMIN: All except ORGANIZATION:DELETE, ORGANIZATION:MANAGE
    // VIEWER: Read-only permissions
    
    const ownerPerms = [
      'TASK:CREATE', 'TASK:READ', 'TASK:UPDATE', 'TASK:DELETE', 'TASK:RESTORE',
      'ORGANIZATION:READ', 'ORGANIZATION:UPDATE', 'ORGANIZATION:DELETE', 'ORGANIZATION:MANAGE',
      'MEMBER:READ', 'MEMBER:UPDATE', 'MEMBER:DELETE', 'MEMBER:INVITE',
      'AUDIT_LOG:READ',
      'INVITATION:CREATE', 'INVITATION:READ', 'INVITATION:DELETE',
    ];

    const adminPerms = [
      'TASK:CREATE', 'TASK:READ', 'TASK:UPDATE', 'TASK:DELETE', 'TASK:RESTORE',
      'ORGANIZATION:READ', 'ORGANIZATION:UPDATE',
      'MEMBER:READ', 'MEMBER:UPDATE', 'MEMBER:INVITE',
      'AUDIT_LOG:READ',
      'INVITATION:CREATE', 'INVITATION:READ', 'INVITATION:DELETE',
    ];

    const viewerPerms = [
      'TASK:READ', 'TASK:UPDATE', // Viewers can update task status only (enforced at service level)
      'ORGANIZATION:READ',
      'MEMBER:READ',
      'INVITATION:READ',
    ];

    // Insert role-permission mappings
    for (const permKey of ownerPerms) {
      const permId = permMap.get(permKey);
      if (permId) {
        await queryRunner.query(`
          INSERT INTO "role_permissions" ("role", "permission_id")
          VALUES ('OWNER', '${permId}')
        `);
      }
    }

    for (const permKey of adminPerms) {
      const permId = permMap.get(permKey);
      if (permId) {
        await queryRunner.query(`
          INSERT INTO "role_permissions" ("role", "permission_id")
          VALUES ('ADMIN', '${permId}')
        `);
      }
    }

    for (const permKey of viewerPerms) {
      const permId = permMap.get(permKey);
      if (permId) {
        await queryRunner.query(`
          INSERT INTO "role_permissions" ("role", "permission_id")
          VALUES ('VIEWER', '${permId}')
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "user_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    
    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."permissions_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."permissions_resource_enum"`);
  }
}
