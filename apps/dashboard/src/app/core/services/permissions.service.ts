import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap, tap, catchError, of, map } from 'rxjs';
import {
  PermissionAction,
  PermissionResource,
  IOrganization,
} from '@task-manager/data/frontend';
import { OrganizationService } from './organization.service';

export interface EffectivePermission {
  resource: PermissionResource;
  action: PermissionAction;
  granted: boolean;
}

export interface PermissionKey {
  resource: PermissionResource;
  action: PermissionAction;
}

@Injectable({
  providedIn: 'root',
})
export class PermissionsService {
  private readonly API_URL = '/api/v1/auth';

  private readonly http = inject(HttpClient);
  private readonly organizationService = inject(OrganizationService);

  // Store permissions for current organization
  private readonly _permissions = signal<EffectivePermission[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly permissions = this._permissions.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed permission map for fast lookups
  private readonly permissionMap = computed(() => {
    const map = new Map<string, boolean>();
    for (const perm of this._permissions()) {
      map.set(`${perm.resource}:${perm.action}`, perm.granted);
    }
    return map;
  });

  constructor() {
    // Auto-load permissions when organization changes
    toObservable(this.organizationService.currentOrg).pipe(
      switchMap((org: IOrganization | null) => {
        if (org?.id) {
          return this.loadPermissions(org.id);
        }
        this._permissions.set([]);
        return of([]);
      })
    ).subscribe();
  }

  /**
   * Load permissions for a specific organization
   */
  loadPermissions(organizationId: string) {
    this._isLoading.set(true);
    this._error.set(null);

    return this.http
      .get<{ permissions: EffectivePermission[] }>(
        `${this.API_URL}/permissions/${organizationId}`
      )
      .pipe(
        tap((response) => {
          this._permissions.set(response.permissions);
          this._isLoading.set(false);
        }),
        map((response) => response.permissions),
        catchError((error) => {
          this._error.set(error.message || 'Failed to load permissions');
          this._isLoading.set(false);
          this._permissions.set([]);
          return of([]);
        })
      );
  }

  /**
   * Check if user has a specific permission
   * Returns a computed signal that updates reactively
   */
  can(resource: PermissionResource, action: PermissionAction): boolean {
    const key = `${resource}:${action}`;
    return this.permissionMap().get(key) ?? false;
  }

  /**
   * Create a computed signal for a permission check
   * Use this in components for reactive permission checks
   */
  canSignal(resource: PermissionResource, action: PermissionAction) {
    return computed(() => {
      const key = `${resource}:${action}`;
      return this.permissionMap().get(key) ?? false;
    });
  }

  /**
   * Check multiple permissions (any of them)
   */
  canAny(...permissions: PermissionKey[]): boolean {
    for (const perm of permissions) {
      if (this.can(perm.resource, perm.action)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check multiple permissions (all of them)
   */
  canAll(...permissions: PermissionKey[]): boolean {
    for (const perm of permissions) {
      if (!this.can(perm.resource, perm.action)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all granted permissions
   */
  getGrantedPermissions(): EffectivePermission[] {
    return this._permissions().filter((p) => p.granted);
  }

  /**
   * Convenience methods for common permission checks
   */
  canCreateTasks = computed(() =>
    this.can(PermissionResource.TASK, PermissionAction.CREATE)
  );

  canReadTasks = computed(() =>
    this.can(PermissionResource.TASK, PermissionAction.READ)
  );

  canUpdateTasks = computed(() =>
    this.can(PermissionResource.TASK, PermissionAction.UPDATE)
  );

  canDeleteTasks = computed(() =>
    this.can(PermissionResource.TASK, PermissionAction.DELETE)
  );

  canRestoreTasks = computed(() =>
    this.can(PermissionResource.TASK, PermissionAction.RESTORE)
  );

  canManageOrganization = computed(() =>
    this.can(PermissionResource.ORGANIZATION, PermissionAction.MANAGE)
  );

  canDeleteOrganization = computed(() =>
    this.can(PermissionResource.ORGANIZATION, PermissionAction.DELETE)
  );

  canInviteMembers = computed(() =>
    this.can(PermissionResource.MEMBER, PermissionAction.INVITE)
  );

  canReadAuditLogs = computed(() =>
    this.can(PermissionResource.AUDIT_LOG, PermissionAction.READ)
  );

  /**
   * Clear all cached permissions
   */
  clearPermissions(): void {
    this._permissions.set([]);
    this._error.set(null);
  }
}
