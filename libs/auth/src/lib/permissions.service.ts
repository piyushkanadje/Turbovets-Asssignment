import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Permission,
  RolePermission,
  UserPermission,
  UserOrganization,
  PermissionAction,
  PermissionResource,
  OrganizationRole,
} from '@task-manager/data';

export interface EffectivePermission {
  resource: PermissionResource;
  action: PermissionAction;
  granted: boolean;
}

export interface PermissionCheck {
  resource: PermissionResource;
  action: PermissionAction;
}

@Injectable()
export class PermissionsService {
  // In-memory cache for role permissions (rarely changes)
  private rolePermissionsCache: Map<OrganizationRole, PermissionCheck[]> | null = null;

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>
  ) {}

  /**
   * Check if a user has a specific permission within an organization.
   * Considers: role-based permissions + user-level overrides.
   */
  async hasPermission(
    userId: string,
    organizationId: string,
    resource: PermissionResource,
    action: PermissionAction
  ): Promise<boolean> {
    // 1. Get user's role in the organization
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId },
    });

    if (!membership) {
      return false;
    }

    // 2. Check for user-level override first
    const userOverride = await this.userPermissionRepository
      .createQueryBuilder('up')
      .innerJoin('up.permission', 'p')
      .where('up.userId = :userId', { userId })
      .andWhere('up.organizationId = :organizationId', { organizationId })
      .andWhere('p.resource = :resource', { resource })
      .andWhere('p.action = :action', { action })
      .select(['up.granted'])
      .getOne();

    if (userOverride !== null) {
      return userOverride.granted;
    }

    // 3. Check role-based permissions
    const rolePermissions = await this.getRolePermissions(membership.role);
    return rolePermissions.some(
      (p) => p.resource === resource && p.action === action
    );
  }

  /**
   * Get all effective permissions for a user within an organization.
   */
  async getUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<EffectivePermission[]> {
    // 1. Get user's role
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId },
    });

    if (!membership) {
      return [];
    }

    // 2. Get all permissions
    const allPermissions = await this.permissionRepository.find();

    // 3. Get role-based permissions
    const rolePermissions = await this.getRolePermissions(membership.role);
    const rolePermSet = new Set(
      rolePermissions.map((p) => `${p.resource}:${p.action}`)
    );

    // 4. Get user-level overrides
    const userOverrides = await this.userPermissionRepository
      .createQueryBuilder('up')
      .innerJoinAndSelect('up.permission', 'p')
      .where('up.userId = :userId', { userId })
      .andWhere('up.organizationId = :organizationId', { organizationId })
      .getMany();

    const overrideMap = new Map<string, boolean>();
    for (const override of userOverrides) {
      const key = `${override.permission.resource}:${override.permission.action}`;
      overrideMap.set(key, override.granted);
    }

    // 5. Compute effective permissions
    const effectivePermissions: EffectivePermission[] = [];

    for (const perm of allPermissions) {
      const key = `${perm.resource}:${perm.action}`;

      // Check if there's a user override
      if (overrideMap.has(key)) {
        effectivePermissions.push({
          resource: perm.resource,
          action: perm.action,
          granted: overrideMap.get(key)!,
        });
      } else {
        // Use role-based permission
        effectivePermissions.push({
          resource: perm.resource,
          action: perm.action,
          granted: rolePermSet.has(key),
        });
      }
    }

    return effectivePermissions;
  }

  /**
   * Get permissions for a specific role (cached).
   */
  async getRolePermissions(role: OrganizationRole): Promise<PermissionCheck[]> {
    // Load cache if needed
    if (!this.rolePermissionsCache) {
      await this.loadRolePermissionsCache();
    }

    return this.rolePermissionsCache?.get(role) ?? [];
  }

  /**
   * Get all permissions available in the system.
   */
  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  /**
   * Grant a specific permission to a user (override).
   */
  async grantUserPermission(
    userId: string,
    organizationId: string,
    permissionId: string
  ): Promise<UserPermission> {
    const existing = await this.userPermissionRepository.findOne({
      where: { userId, organizationId, permissionId },
    });

    if (existing) {
      existing.granted = true;
      return this.userPermissionRepository.save(existing);
    }

    const userPermission = this.userPermissionRepository.create({
      userId,
      organizationId,
      permissionId,
      granted: true,
    });

    return this.userPermissionRepository.save(userPermission);
  }

  /**
   * Deny a specific permission to a user (override).
   */
  async denyUserPermission(
    userId: string,
    organizationId: string,
    permissionId: string
  ): Promise<UserPermission> {
    const existing = await this.userPermissionRepository.findOne({
      where: { userId, organizationId, permissionId },
    });

    if (existing) {
      existing.granted = false;
      return this.userPermissionRepository.save(existing);
    }

    const userPermission = this.userPermissionRepository.create({
      userId,
      organizationId,
      permissionId,
      granted: false,
    });

    return this.userPermissionRepository.save(userPermission);
  }

  /**
   * Remove a user permission override (revert to role-based).
   */
  async removeUserPermissionOverride(
    userId: string,
    organizationId: string,
    permissionId: string
  ): Promise<void> {
    await this.userPermissionRepository.delete({
      userId,
      organizationId,
      permissionId,
    });
  }

  /**
   * Load role permissions into cache.
   */
  private async loadRolePermissionsCache(): Promise<void> {
    this.rolePermissionsCache = new Map();

    const rolePermissions = await this.rolePermissionRepository
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .getMany();

    for (const rp of rolePermissions) {
      const existing = this.rolePermissionsCache.get(rp.role) ?? [];
      existing.push({
        resource: rp.permission.resource,
        action: rp.permission.action,
      });
      this.rolePermissionsCache.set(rp.role, existing);
    }
  }

  /**
   * Clear the role permissions cache (call after modifying role permissions).
   */
  clearCache(): void {
    this.rolePermissionsCache = null;
  }
}
