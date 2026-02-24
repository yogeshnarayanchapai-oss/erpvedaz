

# Dynamic Roles & Permissions System

## Summary
Existing hardcoded role system lai database-driven dynamic RBAC system ma upgrade garne. Custom roles create garna milne, existing roles backfill garne, ra system ka sabai modules/submodules (sidebar menu/submenu wise) lai database ma register garera -- kunai role lai kun module access dine vanne UI bata manage garna milne banaucha. Future ma code change nagarikana naya role banayera permissions assign garna sakincha.

## Current State
- **system_roles** table exists, only 2 entries (Calling, Cook) -- needs all 11 roles backfilled
- **system_modules** table exists but EMPTY -- needs all sidebar menu/submenu items populated
- **role_permissions** table exists but EMPTY -- needs default permissions seeded
- RLS policies already exist on all 3 tables
- UI page exists at `/admin/roles-permissions` with basic tab + permission toggle interface

## Implementation Plan

### Step 1: Database -- Backfill Roles & Seed Modules

**Backfill all existing app_role enum values into system_roles:**
- OWNER (Admin), ADMIN (Manager), LEADS, CALLING, FOLLOWUP, LOGISTICS, MARKETING, HR, ACCOUNTANT, WAREHOUSE, MANAGER
- Mark all as `is_system_role = true`

**Seed system_modules with all sidebar menu/submenu components grouped by category:**

| Category | Module | Description |
|----------|--------|-------------|
| **Dashboard** | Admin Dashboard, Sales Dashboard, Calling Dashboard, Leads Dashboard, Marketing Dashboard, HR Dashboard, Logistics Dashboard, Accounting Dashboard |
| **Sales** | Products, Branches, Leads, AI Leads, Orders, Customers, Analytics, Sales Activity Log, Reports, Daily Performance, Staff Targets |
| **Inventory** | Stock Summary, Stock Movements, Inventory Activity Log, Parties, Warehouses, Daily P/L |
| **Accounting** | Transactions, Accounting Activity Log, Accounts, Categories, Party Statement |
| **Marketing** | Ads Spend, Influencer List, Campaigns, Video Production, Content Calendar, Marketing Reports |
| **HRM** | Employees, Documents, Attendance & Leave, Company Info, Notices, Salary & Payroll, Team Chat, Knowledge Center |
| **Logistics** | Control Center, Logistics Dashboard, NCM Analytics, GBL Analytics, Pathao Analytics, Logistics Settings |
| **Admin** | Users, Roles & Permissions, Stores, Task Management, Branding, Backup, Messaging, Settings |
| **Staff Self-Service** | My HR, My Documents, My Attendance & Leave, My Tasks, My Training, My Courses, Certificates |

**Seed default role_permissions** based on current hardcoded sidebar access patterns.

### Step 2: Enhance Sidebar to be Permission-Driven

Currently `AppSidebar.tsx` uses hardcoded `menuItems: Record<AppRole, MenuItem[]>`. Change to:

1. Create a **master module registry** that maps every `system_module.name` to its URL, icon, and parent/children structure
2. Fetch user's role permissions via `useAllRolePermissions()` or a new `useMyPermissions()` hook
3. Filter the master module list to only show modules where the user's role has `can_view = true`
4. This way, when you add a permission to a role in the UI, sidebar automatically updates

### Step 3: Enhance the RolesPermissions UI

Improve the existing page to show:
- All roles as tabs (with existing roles backfilled)
- Modules grouped by category (Sales, Inventory, Accounting, Marketing, HRM, etc.)
- Each module row shows 6 toggle switches: View, Create, Edit, Delete, Export, Settings
- "Create Role" dialog for custom roles
- Category-level bulk toggles (enable/disable all permissions for a category)
- Visual indicators for system vs custom roles

### Step 4: Create `useMyPermissions` Hook

New hook that:
- Fetches current user's effective role
- Loads permissions for that role from `role_permissions`
- Returns helper functions: `canView('module_name')`, `canEdit('module_name')`, `canDelete('module_name')`, etc.
- Used by sidebar, pages, and individual components for access control

### Step 5: Integrate Permission Checks in Key Pages

Replace hardcoded role checks like `effectiveRole === 'OWNER'` with permission-based checks where appropriate:
- Delete buttons: check `canDelete('orders')`
- Export buttons: check `canExport('orders')`
- Settings access: check `canManageSettings('accounting')`
- Create buttons: check `canCreate('leads')`

---

## Technical Details

### Migration SQL (Backfill + Seed)

```sql
-- Backfill system_roles with all existing app_role values
INSERT INTO system_roles (role_key, display_name, description, is_system_role) VALUES
  ('OWNER', 'Admin', 'Highest privilege - full system access', true),
  ('ADMIN', 'Manager', 'Second level - manages store operations', true),
  ('LEADS', 'Leads', 'Manages lead assignment and distribution', true),
  ('FOLLOWUP', 'Follow-up', 'Handles follow-up and logistics', true),
  ('LOGISTICS', 'Logistics', 'Manages shipping and delivery', true),
  ('MARKETING', 'Marketing', 'Manages ads, campaigns, content', true),
  ('HR', 'HR', 'Human resource management', true),
  ('ACCOUNTANT', 'Accountant', 'Financial management', true),
  ('WAREHOUSE', 'Warehouse', 'Stock and inventory management', true),
  ('MANAGER', 'Manager (Legacy)', 'Legacy manager role', true)
ON CONFLICT (role_key) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  is_system_role = true;

-- Seed ~50+ system_modules matching sidebar structure
INSERT INTO system_modules (name, display_name, category, sort_order) VALUES
  ('admin_dashboard', 'Admin Dashboard', 'Dashboard', 1),
  ('sales_dashboard', 'Sales Dashboard', 'Dashboard', 2),
  -- ... (all modules listed above)
  ('products', 'Products', 'Sales', 10),
  ('leads', 'Leads', 'Sales', 11),
  -- etc.
ON CONFLICT DO NOTHING;

-- Seed default permissions based on current hardcoded access
-- (large INSERT with role_id subquery matching role_key)
```

### Module Registry (maps module_name to URL/icon/structure)

```typescript
// src/lib/moduleRegistry.ts
export const MODULE_REGISTRY: Record<string, {
  url: string;
  icon: LucideIcon;
  parentModule?: string; // for submenu grouping
}> = {
  'admin_dashboard': { url: '/admin/dashboard', icon: LayoutDashboard },
  'products': { url: '/admin/products', icon: Package },
  'leads': { url: '/admin/leads', icon: Phone },
  // ... all modules
};
```

### useMyPermissions Hook

```typescript
export function useMyPermissions() {
  const { effectiveRole } = useEffectiveRole();
  const { data: roles } = useSystemRoles();
  const { data: permissions } = useAllRolePermissions();
  
  const myRole = roles?.find(r => r.role_key === effectiveRole);
  const myPermissions = permissions?.filter(p => p.role_id === myRole?.id) || [];
  
  return {
    canView: (moduleName: string) => myPermissions.some(p => p.module?.name === moduleName && p.can_view),
    canCreate: (moduleName: string) => myPermissions.some(p => p.module?.name === moduleName && p.can_create),
    canEdit: (moduleName: string) => myPermissions.some(p => p.module?.name === moduleName && p.can_edit),
    canDelete: (moduleName: string) => myPermissions.some(p => p.module?.name === moduleName && p.can_delete),
    canExport: (moduleName: string) => myPermissions.some(p => p.module?.name === moduleName && p.can_export),
    canManageSettings: (moduleName: string) => myPermissions.some(p => p.module?.name === moduleName && p.can_manage_settings),
    permissions: myPermissions,
  };
}
```

### Dynamic Sidebar Generation

```typescript
// AppSidebar will change from:
const items = menuItems[role] || menuItems.CALLING;

// To:
const { canView } = useMyPermissions();
const items = buildMenuFromPermissions(canView);
// Filters MODULE_REGISTRY to only show modules user can view
// Groups by category, builds parent/children structure
```

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create - backfill roles + seed modules + seed permissions |
| `src/lib/moduleRegistry.ts` | Create - module name to URL/icon mapping |
| `src/hooks/useMyPermissions.ts` | Create - permission check hook |
| `src/hooks/useRBAC.ts` | Update - add `useMyPermissions` |
| `src/components/layout/AppSidebar.tsx` | Major update - dynamic menu from permissions |
| `src/pages/admin/RolesPermissions.tsx` | Enhance - better UI, category grouping, bulk toggles |

### OWNER Bypass
OWNER role will always have full access regardless of permission entries (hardcoded bypass in `useMyPermissions`). This ensures OWNER can never be locked out.

