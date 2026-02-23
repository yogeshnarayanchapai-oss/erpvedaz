

# Module Store-wise Toggle System

## Summary
Settings page ma 5 modules (Sales, Inventory, Accounting, Marketing, HRM) ko lagi ON/OFF toggle switches add garne. Default ON = store-wise (each store ko data alag). OFF = global (sabai store ko data ekai thau ma).

## How It Works

- **ON (Default)**: Module store-wise operate huncha -- current store ko data matra dekhaucha (existing behavior)
- **OFF**: Module globally operate huncha -- sabai store ko data ekai thau ma dekhaucha, store_id filtering skip huncha

## Implementation Steps

### Step 1: Database Table Create
New table `module_store_settings` banaucha:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| module_name | text (unique) | 'sales', 'inventory', 'accounting', 'marketing', 'hrm' |
| is_store_wise | boolean | Default true (ON) |
| updated_at | timestamp | Auto-updated |
| updated_by | uuid | Who changed it |

RLS policies: Only OWNER can read/update these settings.

### Step 2: React Hook -- `useModuleStoreSettings`
New hook `src/hooks/useModuleStoreSettings.ts`:
- Fetch all module settings
- `useIsModuleStoreWise(moduleName)` -- returns boolean
- `useToggleModuleStoreWise()` -- mutation to toggle
- Cache with React Query

### Step 3: Update `useCurrentStoreId` Hook
`useCurrentStoreId` ma optional `module` parameter add garne:
- `useCurrentStoreId('hrm')` -- if HRM is OFF, returns `null` (no store filtering)
- `useCurrentStoreId()` -- existing behavior (always returns store ID)

Or create a new wrapper hook: `useModuleStoreId(module: string)` that returns `storeId` if module is store-wise, else `null`.

### Step 4: Settings UI
AdminSettings.tsx ko General tab ma new card "Module Store Settings" add garne with 5 toggle switches:
- Sales (default ON)
- Inventory (default ON)
- Accounting (default ON)
- Marketing (default ON)
- HRM (default ON)

Each toggle shows module name + description + current state.

### Step 5: Update Data Hooks
Each module ko hooks ma `useCurrentStoreId()` lai `useModuleStoreId('module_name')` le replace garne. When module is global (OFF), storeId = null, so queries won't filter by store_id.

Affected hook categories:
- **Sales**: useOrders, useLeads, useCustomers, etc.
- **Inventory**: useWarehouses, useInventorySummaryByWarehouse, etc.
- **Accounting**: useAccounts, usePartyTransactions, usePartyPayments, etc.
- **Marketing**: useInfluencers, useCampaigns, etc.
- **HRM**: useEmployees, useLeaveRequests, useAttendance, etc.

---

## Technical Details

### Database Migration SQL
```sql
CREATE TABLE public.module_store_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name text NOT NULL UNIQUE,
  is_store_wise boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert defaults
INSERT INTO module_store_settings (module_name) VALUES
  ('sales'), ('inventory'), ('accounting'), ('marketing'), ('hrm');

-- RLS
ALTER TABLE module_store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read" ON module_store_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only OWNER can update" ON module_store_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'OWNER'));
```

### New Hook: `useModuleStoreId`
```typescript
export function useModuleStoreId(module: string): string | null {
  const storeId = useCurrentStoreId();
  const { data: settings } = useModuleStoreSettings();
  
  const moduleSetting = settings?.find(s => s.module_name === module);
  // If store-wise is OFF, return null (no filtering)
  if (moduleSetting && !moduleSetting.is_store_wise) return null;
  return storeId;
}
```

### Hook Update Pattern
Each module hook ma change:
```typescript
// Before:
const storeId = useCurrentStoreId();

// After (e.g., in HRM hooks):
const storeId = useModuleStoreId('hrm');
```

When `storeId` is `null`, existing query patterns already skip the `.eq('store_id', storeId)` filter (most hooks check `if (storeId)` before adding the filter).

### Settings UI Component
Toggle switches with Switch component, OWNER-only access, real-time save on toggle change.

