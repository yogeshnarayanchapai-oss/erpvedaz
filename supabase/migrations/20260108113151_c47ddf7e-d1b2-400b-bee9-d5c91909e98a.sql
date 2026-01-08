-- Fix leave_types uniqueness: change from global unique to store-wise unique
-- This allows different stores to have the same leave type names

-- Step 1: Drop the unique constraint on name (it's a constraint, not just an index)
ALTER TABLE public.leave_types DROP CONSTRAINT IF EXISTS leave_types_name_key;

-- Step 2: Create store-wise uniqueness (case-insensitive) for store-specific leave types
-- Each store can have unique leave type names
CREATE UNIQUE INDEX IF NOT EXISTS leave_types_store_name_unique 
ON public.leave_types (store_id, lower(name)) 
WHERE store_id IS NOT NULL;

-- Step 3: Create global uniqueness (case-insensitive) for shared/global leave types
-- Shared leave types (store_id IS NULL) must have unique names
CREATE UNIQUE INDEX IF NOT EXISTS leave_types_global_name_unique 
ON public.leave_types (lower(name)) 
WHERE store_id IS NULL;