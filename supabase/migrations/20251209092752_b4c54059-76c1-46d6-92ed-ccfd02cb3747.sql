
-- Fix warehouses unique constraint to be store-wise
-- Allow same code in different stores, but unique within each store

-- Drop the existing unique constraint on code alone
ALTER TABLE public.warehouses DROP CONSTRAINT IF EXISTS warehouses_code_key;

-- Create new unique constraint on (code, store_id)
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_code_store_unique UNIQUE (code, store_id);
