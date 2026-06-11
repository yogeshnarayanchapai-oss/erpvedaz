
-- Add cancel_reason column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Cancel reasons table
CREATE TABLE IF NOT EXISTS public.lead_cancel_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_cancel_reasons_name_store_unique UNIQUE (name, store_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_cancel_reasons_store_id ON public.lead_cancel_reasons(store_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_cancel_reasons TO authenticated;
GRANT ALL ON public.lead_cancel_reasons TO service_role;

ALTER TABLE public.lead_cancel_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active cancel reasons for their store" ON public.lead_cancel_reasons;
CREATE POLICY "Users can view active cancel reasons for their store"
  ON public.lead_cancel_reasons FOR SELECT
  USING (
    is_active = true
    AND (store_id IS NULL OR user_has_store_access(auth.uid(), store_id) OR is_owner(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins/Managers can manage cancel reasons" ON public.lead_cancel_reasons;
CREATE POLICY "Admins/Managers can manage cancel reasons"
  ON public.lead_cancel_reasons FOR ALL
  USING (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'MANAGER'::app_role)
    OR is_owner(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'MANAGER'::app_role)
    OR is_owner(auth.uid())
  );

CREATE TRIGGER update_lead_cancel_reasons_updated_at
  BEFORE UPDATE ON public.lead_cancel_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
