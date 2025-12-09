-- Add store_role column to user_store_access table for per-store role assignment
ALTER TABLE public.user_store_access 
ADD COLUMN IF NOT EXISTS store_role app_role DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_store_access.store_role IS 'Role assigned to user for this specific store. Overrides global role when set.';