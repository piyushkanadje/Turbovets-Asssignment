import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Permission } from './permission.entity';

/**
 * User-level permission overrides.
 * Allows granting or denying specific permissions to a user within an organization,
 * beyond what their role provides.
 */
@Entity('user_permissions')
@Unique('uq_user_org_permission', ['userId', 'organizationId', 'permissionId'])
@Index('idx_user_permission_user_org', ['userId', 'organizationId'])
export class UserPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId!: string;

  /**
   * If true, grants the permission. If false, denies it (overrides role).
   */
  @Column({ type: 'boolean', default: true })
  granted!: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: Permission;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
