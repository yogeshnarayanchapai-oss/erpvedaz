-- Drop all existing triggers and function with CASCADE
DROP TRIGGER IF EXISTS trigger_generate_lead_reference_id ON public.leads;
DROP TRIGGER IF EXISTS set_lead_reference_id ON public.leads;
DROP FUNCTION IF EXISTS public.generate_lead_reference_id() CASCADE;

-- Create sequence if not exists
CREATE SEQUENCE IF NOT EXISTS public.lead_reference_id_seq START WITH 1;

-- Set sequence to max existing reference_id + 1
DO $$
DECLARE
  max_ref INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(reference_id, '')::INTEGER), 0) INTO max_ref FROM public.leads WHERE reference_id ~ '^\d+$';
  IF max_ref >= (SELECT last_value FROM public.lead_reference_id_seq) THEN
    PERFORM setval('public.lead_reference_id_seq', max_ref + 1, false);
  END IF;
END $$;

-- Create function with proper locking for concurrent inserts
CREATE OR REPLACE FUNCTION public.generate_lead_reference_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    NEW.reference_id := LPAD(nextval('public.lead_reference_id_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_generate_lead_reference_id
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_lead_reference_id();