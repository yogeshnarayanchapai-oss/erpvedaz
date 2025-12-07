-- Fix 1: Remove logistics_settings visibility from LOGISTICS role
-- Sensitive API credentials should only be accessible by ADMIN
DROP POLICY IF EXISTS "Logistics and Admin can view settings" ON public.logistics_settings;

-- Fix 2: Remove accounting_banks visibility from MANAGER role  
-- Bank account details should only be accessible by ADMIN
DROP POLICY IF EXISTS "Managers can view banks" ON public.accounting_banks;