import { useMemo } from 'react';
import { useEffectiveRole } from './useEffectiveRole';
import { useSystemRoles, useAllRolePermissions, type RolePermissionWithDetails } from './useRBAC';

/**
 * Hook that provides permission check helpers for the current user.
 * OWNER role always has full access (hardcoded bypass).
 */
export function useMyPermissions() {
  const { effectiveRole } = useEffectiveRole();
  const { data: roles, isLoading: rolesLoading } = useSystemRoles();
  const { data: allPermissions, isLoading: permsLoading } = useAllRolePermissions();

  const isOwner = effectiveRole === 'OWNER';
  const isLoading = rolesLoading || permsLoading;

  const myPermissions = useMemo(() => {
    if (isOwner || !roles || !allPermissions) return [];
    const myRole = roles.find(r => r.role_key === effectiveRole);
    if (!myRole) return [];
    return allPermissions.filter(p => p.role_id === myRole.id);
  }, [effectiveRole, roles, allPermissions, isOwner]);

  // Build a lookup map for fast access: moduleName -> permission
  const permissionMap = useMemo(() => {
    const map = new Map<string, RolePermissionWithDetails>();
    for (const p of myPermissions) {
      if (p.module?.name) {
        map.set(p.module.name, p);
      }
    }
    return map;
  }, [myPermissions]);

  const canView = (moduleName: string): boolean => {
    if (isOwner) return true;
    return permissionMap.get(moduleName)?.can_view ?? false;
  };

  const canCreate = (moduleName: string): boolean => {
    if (isOwner) return true;
    return permissionMap.get(moduleName)?.can_create ?? false;
  };

  const canEdit = (moduleName: string): boolean => {
    if (isOwner) return true;
    return permissionMap.get(moduleName)?.can_edit ?? false;
  };

  const canDelete = (moduleName: string): boolean => {
    if (isOwner) return true;
    return permissionMap.get(moduleName)?.can_delete ?? false;
  };

  const canExport = (moduleName: string): boolean => {
    if (isOwner) return true;
    return permissionMap.get(moduleName)?.can_export ?? false;
  };

  const canManageSettings = (moduleName: string): boolean => {
    if (isOwner) return true;
    return permissionMap.get(moduleName)?.can_manage_settings ?? false;
  };

  /**
   * Returns the list of module names the user can view.
   */
  const viewableModules = useMemo(() => {
    if (isOwner) return null; // null means "all" for OWNER
    return new Set(
      myPermissions
        .filter(p => p.can_view && p.module?.name)
        .map(p => p.module!.name)
    );
  }, [myPermissions, isOwner]);

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canManageSettings,
    viewableModules,
    isOwner,
    isLoading,
    permissions: myPermissions,
    effectiveRole,
  };
}
