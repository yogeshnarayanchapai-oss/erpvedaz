-- Drop the old unique constraint on name only
ALTER TABLE public.lead_sources DROP CONSTRAINT IF EXISTS lead_sources_name_key;

-- Create a new unique constraint on name + store_id combination
ALTER TABLE public.lead_sources ADD CONSTRAINT lead_sources_name_store_unique UNIQUE (name, store_id);