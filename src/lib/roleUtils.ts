// Role display mapping - database values to UI labels
// OWNER (highest privilege) displays as "Admin"
// ADMIN displays as "Manager"
// MANAGER is removed from the system (absorbed into Manager which was ADMIN)

import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

// All available roles
export const ALL_ROLES: AppRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_MANAGER', 'LEADS', 'CALLING', 'FOLLOWUP', 'LOGISTICS', 'MARKETING', 'HR', 'ACCOUNTANT', 'WAREHOUSE'];

// Map database role values to display labels
export const ROLE_DISPLAY_LABELS: Record<AppRole, string> = {
  OWNER: 'Admin',           // Highest privilege - displays as "Admin"
  ADMIN: 'Admin Manager',   // Second level - displays as "Admin Manager" (full admin scope)
  MANAGER: 'Manager',       // Original Manager role (admin-equivalent access)
  SALES_MANAGER: 'Sales Manager', // Sales-only manager (scoped to Sales menu)
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

// Role options for dropdowns
export const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'CALLING', label: 'Calling' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'FOLLOWUP', label: 'Follow-up' },
  { value: 'LEADS', label: 'Leads' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'HR', label: 'HR' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'SALES_MANAGER', label: 'Sales Manager' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin Manager' },
  { value: 'OWNER', label: 'Admin' },
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
  { value: 'SALES_MANAGER', label: 'Sales Manager' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin Manager' },
];

// Check if user has admin-level access (OWNER in database = Admin in UI)
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'OWNER';
}

// Check if user has manager-level access  
export function isManagerRole(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'SALES_MANAGER';
}

// Check if user has admin or manager level access
export function isAdminOrManager(role: string | null | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' || role === 'SALES_MANAGER';
}

// Role badge colors
export const roleColors: Record<string, string> = {
  OWNER: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  ADMIN: 'bg-primary/10 text-primary border-primary/20',
  MANAGER: 'bg-primary/10 text-primary border-primary/20',
  SALES_MANAGER: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  LEADS: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  CALLING: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  FOLLOWUP: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  LOGISTICS: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  MARKETING: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  HR: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  ACCOUNTANT: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  WAREHOUSE: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
};
