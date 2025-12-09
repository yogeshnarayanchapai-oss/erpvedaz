-- Add store_id to lead_sources for store-specific sources
ALTER TABLE public.lead_sources ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_sources_store_id ON public.lead_sources(store_id);

-- Enable RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Authenticated users can view lead sources" ON public.lead_sources;
DROP POLICY IF EXISTS "Users can view lead sources for their store" ON public.lead_sources;
DROP POLICY IF EXISTS "Admins can manage store lead sources" ON public.lead_sources;

-- Create RLS policies
CREATE POLICY "Users can view lead sources for their store"
ON public.lead_sources FOR SELECT
USING (
  is_active = true 
  AND (
    store_id IS NULL 
    OR user_has_store_access(auth.uid(), store_id) 
    OR is_owner(auth.uid())
  )
);

CREATE POLICY "Admins can manage store lead sources"
ON public.lead_sources FOR ALL
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) 
  OR is_owner(auth.uid())
);