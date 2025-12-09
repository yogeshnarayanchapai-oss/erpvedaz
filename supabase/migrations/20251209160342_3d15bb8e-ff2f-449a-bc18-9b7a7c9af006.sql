-- Fix search_path security for the function
CREATE OR REPLACE FUNCTION public.generate_lead_reference_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    NEW.reference_id := LPAD(nextval('public.lead_reference_id_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;