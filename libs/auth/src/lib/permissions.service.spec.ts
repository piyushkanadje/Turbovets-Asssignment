import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionsService } from './permissions.service';
import {
  Permission,
  RolePermission,
  UserPermission,
  UserOrganization,
  PermissionAction,
  PermissionResource,
  OrganizationRole,
} from '@task-manager/data';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionRepository: jest.Mocked<Repository<Permission>>;
  let rolePermissionRepository: jest.Mocked<Repository<RolePermission>>;
  let userPermissionRepository: jest.Mocked<Repository<UserPermission>>;
  let userOrgRepository: jest.Mocked<Repository<UserOrganization>>;

  const mockPermission: Permission = {
    id: 'perm-1',
    name: 'Create Tasks',
    description: 'Create new tasks',
    resource: PermissionResource.TASK,
    action: PermissionAction.CREATE,
    createdAt: new Date(),
  };

  const mockRolePermission: RolePermission = {
    id: 'rp-1',
    role: OrganizationRole.ADMIN,
    permissionId: 'perm-1',
    permission: mockPermission,
    createdAt: new Date(),
  };

  const mockUserOrg: UserOrganization = {
    id: 'uo-1',
    userId: 'user-1',
    organizationId: 'org-1',
    role: OrganizationRole.ADMIN,
    createdAt: new Date(),
  } as UserOrganization;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserPermission),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    permissionRepository = module.get(getRepositoryToken(Permission));
    rolePermissionRepository = module.get(getRepositoryToken(RolePermission));
    userPermissionRepository = module.get(getRepositoryToken(UserPermission));
    userOrgRepository = module.get(getRepositoryToken(UserOrganization));
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  describe('hasPermission', () => {
    it('should return false if user is not a member of the organization', async () => {
      userOrgRepository.findOne.mockResolvedValue(null);

      const result = await service.hasPermission(
        'user-1',
        'org-1',
        PermissionResource.TASK,
        PermissionAction.CREATE
      );

      expect(result).toBe(false);
    });

    it('should return true if user has permission via role', async () => {
      userOrgRepository.findOne.mockResolvedValue(mockUserOrg);

      // Mock no user override
      const userPermQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userPermissionRepository.createQueryBuilder.mockReturnValue(userPermQb as any);

      // Mock role permissions
      const rolePermQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRolePermission]),
      };
      rolePermissionRepository.createQueryBuilder.mockReturnValue(rolePermQb as any);

      const result = await service.hasPermission(
        'user-1',
        'org-1',
        PermissionResource.TASK,
        PermissionAction.CREATE
      );

      expect(result).toBe(true);
    });

    it('should respect user permission override (grant)', async () => {
      userOrgRepository.findOne.mockResolvedValue(mockUserOrg);

      // Mock user override granting permission
      const userPermQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ granted: true }),
      };
      userPermissionRepository.createQueryBuilder.mockReturnValue(userPermQb as any);

      const result = await service.hasPermission(
        'user-1',
        'org-1',
        PermissionResource.TASK,
        PermissionAction.DELETE
      );

      expect(result).toBe(true);
    });

    it('should respect user permission override (deny)', async () => {
      userOrgRepository.findOne.mockResolvedValue(mockUserOrg);

      // Mock user override denying permission
      const userPermQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ granted: false }),
      };
      userPermissionRepository.createQueryBuilder.mockReturnValue(userPermQb as any);

      const result = await service.hasPermission(
        'user-1',
        'org-1',
        PermissionResource.TASK,
        PermissionAction.CREATE
      );

      expect(result).toBe(false);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions ordered by resource and action', async () => {
      const permissions = [mockPermission];
      permissionRepository.find.mockResolvedValue(permissions);

      const result = await service.getAllPermissions();

      expect(result).toEqual(permissions);
      expect(permissionRepository.find).toHaveBeenCalledWith({
        order: { resource: 'ASC', action: 'ASC' },
      });
    });
  });

  describe('grantUserPermission', () => {
    it('should create new user permission if not exists', async () => {
      userPermissionRepository.findOne.mockResolvedValue(null);
      const newPerm = {
        userId: 'user-1',
        organizationId: 'org-1',
        permissionId: 'perm-1',
        granted: true,
      };
      userPermissionRepository.create.mockReturnValue(newPerm as any);
      userPermissionRepository.save.mockResolvedValue(newPerm as any);

      const result = await service.grantUserPermission('user-1', 'org-1', 'perm-1');

      expect(userPermissionRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        organizationId: 'org-1',
        permissionId: 'perm-1',
        granted: true,
      });
      expect(result.granted).toBe(true);
    });

    it('should update existing user permission to granted', async () => {
      const existingPerm = {
        userId: 'user-1',
        organizationId: 'org-1',
        permissionId: 'perm-1',
        granted: false,
      };
      userPermissionRepository.findOne.mockResolvedValue(existingPerm as any);
      userPermissionRepository.save.mockResolvedValue({ ...existingPerm, granted: true } as any);

      const result = await service.grantUserPermission('user-1', 'org-1', 'perm-1');

      expect(existingPerm.granted).toBe(true);
      expect(userPermissionRepository.save).toHaveBeenCalled();
    });
  });

  describe('denyUserPermission', () => {
    it('should create new user permission with granted=false if not exists', async () => {
      userPermissionRepository.findOne.mockResolvedValue(null);
      const newPerm = {
        userId: 'user-1',
        organizationId: 'org-1',
        permissionId: 'perm-1',
        granted: false,
      };
      userPermissionRepository.create.mockReturnValue(newPerm as any);
      userPermissionRepository.save.mockResolvedValue(newPerm as any);

      const result = await service.denyUserPermission('user-1', 'org-1', 'perm-1');

      expect(result.granted).toBe(false);
    });
  });

  describe('removeUserPermissionOverride', () => {
    it('should delete user permission override', async () => {
      userPermissionRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeUserPermissionOverride('user-1', 'org-1', 'perm-1');

      expect(userPermissionRepository.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        organizationId: 'org-1',
        permissionId: 'perm-1',
      });
    });
  });

  describe('clearCache', () => {
    it('should clear the role permissions cache', async () => {
      // First load the cache
      userOrgRepository.findOne.mockResolvedValue(mockUserOrg);
      const userPermQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userPermissionRepository.createQueryBuilder.mockReturnValue(userPermQb as any);
      const rolePermQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRolePermission]),
      };
      rolePermissionRepository.createQueryBuilder.mockReturnValue(rolePermQb as any);

      await service.hasPermission('user-1', 'org-1', PermissionResource.TASK, PermissionAction.CREATE);

      // Clear cache
      service.clearCache();

      // Next call should reload cache
      await service.hasPermission('user-1', 'org-1', PermissionResource.TASK, PermissionAction.CREATE);

      // Should have called createQueryBuilder twice (once before clear, once after)
      expect(rolePermissionRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
    });
  });
});
