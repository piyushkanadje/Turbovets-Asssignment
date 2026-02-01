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
import { OrganizationRole } from '../enums/role.enum';
import { Permission } from './permission.entity';

@Entity('role_permissions')
@Unique('uq_role_permission', ['role', 'permissionId'])
@Index('idx_role_permission_role', ['role'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: OrganizationRole,
  })
  role!: OrganizationRole;

  @Column({ name: 'permission_id', type: 'uuid' })
  permissionId!: string;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: Permission;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
