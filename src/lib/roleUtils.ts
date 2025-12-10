// Role display mapping - database values to UI labels
// OWNER (highest privilege) displays as "Admin"
// ADMIN displays as "Manager"
// MANAGER is removed from the system (absorbed into Manager which was ADMIN)

import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

// All available roles (excluding MANAGER which is absorbed)
export const ALL_ROLES: AppRole[] = ['OWNER', 'ADMIN', 'LEADS', 'CALLING', 'FOLLOWUP', 'LOGISTICS', 'MARKETING', 'HR', 'ACCOUNTANT', 'WAREHOUSE'];

// Map database role values to display labels
export const ROLE_DISPLAY_LABELS: Record<AppRole, string> = {
  OWNER: 'Admin',        // Highest privilege - displays as "Admin"
  ADMIN: 'Manager',      // Second level - displays as "Manager"
  MANAGER: 'Manager',    // Legacy - mapped to same as ADMIN
  LEADS: 'Leads',
  CALLING: 'Calling',
  FOLLOWUP: 'Follow-up',
  LOGISTICS: 'Logistics',
  MARKETING: 'Marketing',
  HR: 'HR',
  ACCOUNTANT: 'Accountant',
  WAREHOUSE: 'Warehouse',
};

// Get display label for a role
export function getRoleDisplayLabel(role: AppRole | string | null | undefined): string {
  if (!role) return '-';
  return ROLE_DISPLAY_LABELS[role as AppRole] || role;
}

// Role options for dropdowns (excludes MANAGER as it's absorbed into ADMIN which displays as Manager)
export const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'CALLING', label: 'Calling' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'FOLLOWUP', label: 'Follow-up' },
  { value: 'LEADS', label: 'Leads' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'HR', label: 'HR' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'ADMIN', label: 'Manager' },      // ADMIN displays as Manager
  { value: 'OWNER', label: 'Admin' },        // OWNER displays as Admin (highest)
];

// Role options excluding admin-level roles (for non-admin assignment)
export const STAFF_ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'CALLING', label: 'Calling' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'FOLLOWUP', label: 'Follow-up' },
  { value: 'LEADS', label: 'Leads' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'HR', label: 'HR' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'ADMIN', label: 'Manager' },      // ADMIN displays as Manager
];

// Check if user has admin-level access (OWNER in database = Admin in UI)
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'OWNER';
}

// Check if user has manager-level access (ADMIN in database = Manager in UI)  
export function isManagerRole(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

// Check if user has admin or manager level access
export function isAdminOrManager(role: string | null | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
}

// Role badge colors
export const roleColors: Record<string, string> = {
  OWNER: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',    // Admin (highest)
  ADMIN: 'bg-primary/10 text-primary border-primary/20',              // Manager
  MANAGER: 'bg-primary/10 text-primary border-primary/20',            // Legacy Manager
  LEADS: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  CALLING: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  FOLLOWUP: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  LOGISTICS: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  MARKETING: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  HR: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  ACCOUNTANT: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  WAREHOUSE: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
};
