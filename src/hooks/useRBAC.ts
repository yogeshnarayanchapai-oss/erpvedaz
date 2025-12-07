import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemModule {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface SystemRole {
  id: string;
  role_key: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
}

export interface RolePermission {
  id: string;
  role_id: string;
  module_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_manage_settings: boolean;
}

export interface RolePermissionWithDetails extends RolePermission {
  module?: SystemModule;
  role?: SystemRole;
}

// Fetch all system modules
export function useSystemModules() {
  return useQuery({
    queryKey: ['system-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as SystemModule[];
    },
  });
}

// Fetch all system roles
export function useSystemRoles() {
  return useQuery({
    queryKey: ['system-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_roles')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      
      if (error) throw error;
      return data as SystemRole[];
    },
  });
}

// Fetch permissions for a specific role
export function useRolePermissions(roleId?: string) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return [];
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          *,
          module:system_modules(*),
          role:system_roles(*)
        `)
        .eq('role_id', roleId);
      
      if (error) throw error;
      return data as RolePermissionWithDetails[];
    },
    enabled: !!roleId,
  });
}

// Fetch all permissions (for admin view)
export function useAllRolePermissions() {
  return useQuery({
    queryKey: ['all-role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          *,
          module:system_modules(*),
          role:system_roles(*)
        `);
      
      if (error) throw error;
      return data as RolePermissionWithDetails[];
    },
  });
}

// Update role permission
export function useUpdateRolePermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { 
      roleId: string; 
      moduleId: string; 
      permissions: Partial<Omit<RolePermission, 'id' | 'role_id' | 'module_id'>> 
    }) => {
      const { data: existing } = await supabase
        .from('role_permissions')
        .select('id')
        .eq('role_id', params.roleId)
        .eq('module_id', params.moduleId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('role_permissions')
          .update(params.permissions)
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role_id: params.roleId,
            module_id: params.moduleId,
            ...params.permissions,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-role-permissions'] });
      toast.success('Permission updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update permission: ${error.message}`);
    },
  });
}

// Create new role
export function useCreateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (role: { role_key: string; display_name: string; description?: string }) => {
      const { error } = await supabase
        .from('system_roles')
        .insert(role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-roles'] });
      toast.success('Role created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });
}

// Email verification hooks
export function useVerifyEmail() {
  return useMutation({
    mutationFn: async ({ userId, otp }: { userId: string; otp: string }) => {
      const { data, error } = await supabase.rpc('verify_email_otp', {
        p_user_id: userId,
        p_otp: otp,
      });
      
      if (error) throw error;
      if (!data) throw new Error('Invalid or expired verification code');
      
      return data;
    },
    onSuccess: () => {
      toast.success('Email verified successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Verification failed');
    },
  });
}

export function useResendOTP() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('create_verification_otp', {
        p_user_id: userId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Verification code sent to your email');
    },
    onError: (error: any) => {
      toast.error(`Failed to send code: ${error.message}`);
    },
  });
}