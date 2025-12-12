-- Drop the existing unique constraint on name only
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;

-- Add new composite unique constraint on (name, store_id)
ALTER TABLE public.departments ADD CONSTRAINT departments_name_store_id_key UNIQUE (name, store_id);