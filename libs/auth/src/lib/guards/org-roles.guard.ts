import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { OrganizationRole } from '@task-manager/data';

/**
 * Role hierarchy: OWNER > ADMIN > VIEWER
 * Higher number = higher privilege level
 */
const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  [OrganizationRole.VIEWER]: 1,
  [OrganizationRole.ADMIN]: 2,
  [OrganizationRole.OWNER]: 3,
};

export const ORG_ROLES_KEY = 'org_roles';

/**
 * Decorator to specify minimum required role for an endpoint.
 * Roles are inherited: OWNER can access ADMIN routes, ADMIN can access VIEWER routes.
 *
 * @example
 * @OrgRoles(OrganizationRole.ADMIN)
 * @UseGuards(JwtAuthGuard, OrgRolesGuard)
 * async updateResource() { ... }
 */
export const OrgRoles = (...roles: OrganizationRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);

@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
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

    // Get user's role in the organization
    const userRole = await this.authService.getUserOrganizationRole(
      user.id,
      organizationId
    );

    if (!userRole) {
      throw new ForbiddenException('User is not a member of this organization');
    }

    // Check if user's role meets or exceeds the minimum required role
    // Role inheritance: OWNER (3) >= ADMIN (2) >= VIEWER (1)
    const userRoleLevel = ROLE_HIERARCHY[userRole];
    const minRequiredLevel = Math.min(
      ...requiredRoles.map((role) => ROLE_HIERARCHY[role])
    );

    if (userRoleLevel >= minRequiredLevel) {
      // Attach organization context to request for downstream use
      request.organizationId = organizationId;
      request.userOrgRole = userRole;
      return true;
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredRoles.join(' or ')}, Current: ${userRole}`
    );
  }
}
