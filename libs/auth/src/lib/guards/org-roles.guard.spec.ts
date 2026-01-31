import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRolesGuard, ORG_ROLES_KEY } from './org-roles.guard';
import { AuthService } from '../auth.service';
import { OrganizationRole } from '@task-manager/data';

describe('OrgRolesGuard', () => {
  let guard: OrgRolesGuard;
  let mockReflector: {
    getAllAndOverride: jest.Mock;
  };
  let mockAuthService: {
    getUserOrganizationRole: jest.Mock;
  };

  const createMockExecutionContext = (
    user: { id: string; email: string } | null,
    params: Record<string, string> = {},
    body: Record<string, string> = {},
    query: Record<string, string> = {}
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params, body, query }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    mockAuthService = {
      getUserOrganizationRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgRolesGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    guard = module.get<OrgRolesGuard>(OrgRolesGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('No roles required', () => {
    it('should allow access when no roles are required (null)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext({ id: 'user-1', email: 'test@test.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when no roles are required (empty array)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({ id: 'user-1', email: 'test@test.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Authentication checks', () => {
    it('should throw ForbiddenException when user is not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.ADMIN]);
      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException when organizationId is missing', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.ADMIN]);
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        {},
        {},
        {}
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Organization context required'
      );
    });

    it('should throw ForbiddenException when user is not a member of the organization', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.VIEWER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(null);
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'User is not a member of this organization'
      );
    });
  });

  describe('Role Inheritance - OWNER privileges', () => {
    it('should allow OWNER to access OWNER route', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.OWNER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.OWNER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow OWNER to access ADMIN route (inheritance)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.ADMIN]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.OWNER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow OWNER to access VIEWER route (inheritance)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.VIEWER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.OWNER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Role Inheritance - ADMIN privileges', () => {
    it('should allow ADMIN to access ADMIN route', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.ADMIN]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.ADMIN
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow ADMIN to access VIEWER route (inheritance)', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.VIEWER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.ADMIN
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny ADMIN access to OWNER route', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.OWNER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.ADMIN
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('Role Inheritance - VIEWER privileges', () => {
    it('should allow VIEWER to access VIEWER route', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.VIEWER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.VIEWER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny VIEWER access to ADMIN route', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.ADMIN]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.VIEWER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should deny VIEWER access to OWNER route', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.OWNER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.VIEWER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-1' }
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('Organization ID extraction', () => {
    it('should extract organizationId from params', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.VIEWER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.VIEWER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-from-params' }
      );

      await guard.canActivate(context);

      expect(mockAuthService.getUserOrganizationRole).toHaveBeenCalledWith(
        'user-1',
        'org-from-params'
      );
    });

    it('should extract organizationId from body if not in params', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.VIEWER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.VIEWER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        {},
        { organizationId: 'org-from-body' }
      );

      await guard.canActivate(context);

      expect(mockAuthService.getUserOrganizationRole).toHaveBeenCalledWith(
        'user-1',
        'org-from-body'
      );
    });

    it('should extract organizationId from query if not in params or body', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.VIEWER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.VIEWER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        {},
        {},
        { organizationId: 'org-from-query' }
      );

      await guard.canActivate(context);

      expect(mockAuthService.getUserOrganizationRole).toHaveBeenCalledWith(
        'user-1',
        'org-from-query'
      );
    });

    it('should prefer params over body for organizationId', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.VIEWER]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.VIEWER
      );
      const context = createMockExecutionContext(
        { id: 'user-1', email: 'test@test.com' },
        { organizationId: 'org-from-params' },
        { organizationId: 'org-from-body' }
      );

      await guard.canActivate(context);

      expect(mockAuthService.getUserOrganizationRole).toHaveBeenCalledWith(
        'user-1',
        'org-from-params'
      );
    });
  });

  describe('Request enhancement', () => {
    it('should attach organizationId and userOrgRole to request on success', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([OrganizationRole.ADMIN]);
      mockAuthService.getUserOrganizationRole.mockResolvedValue(
        OrganizationRole.OWNER
      );

      const request: Record<string, unknown> = {
        user: { id: 'user-1', email: 'test@test.com' },
        params: { organizationId: 'org-1' },
        body: {},
        query: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      await guard.canActivate(context);

      expect(request['organizationId']).toBe('org-1');
      expect(request['userOrgRole']).toBe(OrganizationRole.OWNER);
    });
  });
});
