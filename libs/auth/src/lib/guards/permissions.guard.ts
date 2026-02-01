import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';
import { PermissionAction, PermissionResource } from '@task-manager/data';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

export interface RequiredPermission {
  resource: PermissionResource;
  action: PermissionAction;
}

/**
 * Decorator to require a specific permission for an endpoint.
 *
 * @example
 * @RequirePermission(PermissionResource.TASK, PermissionAction.CREATE)
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * async createTask() { ... }
 *
 * @example Multiple permissions (any of them grants access)
 * @RequirePermission(
 *   { resource: PermissionResource.TASK, action: PermissionAction.DELETE },
 *   { resource: PermissionResource.TASK, action: PermissionAction.MANAGE }
 * )
 */
export function RequirePermission(
  resourceOrPermissions: PermissionResource | RequiredPermission[],
  action?: PermissionAction
): MethodDecorator & ClassDecorator {
  let permissions: RequiredPermission[];

  if (typeof resourceOrPermissions === 'string' && action) {
    // Single resource + action format
    permissions = [{ resource: resourceOrPermissions, action }];
  } else if (Array.isArray(resourceOrPermissions)) {
    // Array of permission objects
    permissions = resourceOrPermissions;
  } else {
    permissions = [];
  }

  return SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(REQUIRE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User must be authenticated (JwtAuthGuard should run first)
    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }

    // Extract organizationId from params first, then body, then query
    const organizationId =
      request.params?.organizationId ||
      request.body?.organizationId ||
      request.query?.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // Check if user has any of the required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionsService.hasPermission(
        user.id,
        organizationId,
        permission.resource,
        permission.action
      );

      if (hasPermission) {
        // Attach permission info to request for downstream use
        request.checkedPermission = permission;
        request.organizationId = organizationId;
        return true;
      }
    }

    // None of the required permissions were granted
    const permissionNames = requiredPermissions
      .map((p) => `${p.resource}:${p.action}`)
      .join(' or ');

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${permissionNames}`
    );
  }
}
