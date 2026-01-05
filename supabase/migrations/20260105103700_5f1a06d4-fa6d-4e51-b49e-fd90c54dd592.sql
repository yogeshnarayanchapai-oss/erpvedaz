-- Fix leads delete policy to allow OWNER role
DROP POLICY IF EXISTS leads_delete_store_isolated ON public.leads;

CREATE POLICY leads_delete_store_isolated ON public.leads
FOR DELETE TO authenticated
USING (
  is_owner(auth.uid()) OR 
  (
    (store_id IN (SELECT get_user_store_ids(auth.uid()))) 
    AND has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
  )
);

-- Create table to store factory reset verification codes
CREATE TABLE IF NOT EXISTS public.factory_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.factory_reset_codes ENABLE ROW LEVEL SECURITY;

-- Only owner can access their own codes
CREATE POLICY factory_reset_codes_owner_only ON public.factory_reset_codes
FOR ALL TO authenticated
USING (is_owner(auth.uid()) AND user_id = auth.uid())
WITH CHECK (is_owner(auth.uid()) AND user_id = auth.uid());