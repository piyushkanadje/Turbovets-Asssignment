import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { OrganizationRole } from '@task-manager/data';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: OrganizationRole[]) =>
  SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const organizationId =
      request.params.organizationId || request.body.organizationId;

    if (!userId || !organizationId) {
      return false;
    }

    const userRole = await this.authService.getUserOrganizationRole(
      userId,
      organizationId
    );

    return userRole !== null && requiredRoles.includes(userRole);
  }
}
