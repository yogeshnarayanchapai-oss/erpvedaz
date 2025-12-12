-- Add store_id column to notices table for store-wise filtering
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Add store_id column to leave_quota table for store-wise filtering
ALTER TABLE public.leave_quota ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Create leave_settings table for store-wise settings
CREATE TABLE IF NOT EXISTS public.leave_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id),
  default_monthly_limit INTEGER,
  apply_default_if_no_quota BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id)
);

-- Enable RLS
ALTER TABLE public.leave_settings ENABLE ROW LEVEL SECURITY;

-- RLS policy for leave_settings
CREATE POLICY "Allow authenticated users to manage leave settings"
ON public.leave_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notices_store_id ON public.notices(store_id);
CREATE INDEX IF NOT EXISTS idx_leave_quota_store_id ON public.leave_quota(store_id);