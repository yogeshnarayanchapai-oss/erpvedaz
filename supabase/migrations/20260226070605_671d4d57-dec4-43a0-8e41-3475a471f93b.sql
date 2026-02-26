
-- Add store_id to company_info to make it per-store
ALTER TABLE public.company_info 
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

-- Create unique constraint so each store has only one company_info record
CREATE UNIQUE INDEX IF NOT EXISTS company_info_store_id_unique ON public.company_info(store_id) WHERE store_id IS NOT NULL;
