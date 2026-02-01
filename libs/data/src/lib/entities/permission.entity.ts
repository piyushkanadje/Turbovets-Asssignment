import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { PermissionAction } from '../enums/permission-action.enum';
import { PermissionResource } from '../enums/permission-resource.enum';

@Entity('permissions')
@Unique('uq_permission_resource_action', ['resource', 'action'])
@Index('idx_permission_resource', ['resource'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PermissionResource,
  })
  resource!: PermissionResource;

  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action!: PermissionAction;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
