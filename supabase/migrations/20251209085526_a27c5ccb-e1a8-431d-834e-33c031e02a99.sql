-- Create accounting activity logs table
CREATE TABLE public.accounting_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id),
  action_type TEXT NOT NULL, -- 'DEPOSIT', 'EXPENSE', 'TRANSFER', 'EDIT', 'DELETE'
  entity_type TEXT NOT NULL, -- 'TRANSACTION', 'PARTY', 'ACCOUNT', 'CATEGORY'
  entity_id UUID,
  description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  amount NUMERIC,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounting_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: OWNER, ACCOUNTANT, ADMIN can view (no delete allowed)
CREATE POLICY "Authorized roles can view activity logs"
ON public.accounting_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('OWNER', 'ACCOUNTANT', 'ADMIN')
  )
);

-- RLS Policy: OWNER, ACCOUNTANT can insert
CREATE POLICY "Owner and Accountant can insert activity logs"
ON public.accounting_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('OWNER', 'ACCOUNTANT')
  )
);

-- Create index for performance
CREATE INDEX idx_activity_logs_store ON public.accounting_activity_logs(store_id);
CREATE INDEX idx_activity_logs_performed_at ON public.accounting_activity_logs(performed_at DESC);