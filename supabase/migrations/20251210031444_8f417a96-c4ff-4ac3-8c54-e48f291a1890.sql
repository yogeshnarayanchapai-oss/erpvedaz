-- Reset the lead_reference_id_seq to be after the max existing reference_id
DO $$
DECLARE
  max_ref_id INTEGER;
BEGIN
  -- Get the maximum numeric reference_id value
  SELECT COALESCE(MAX(CAST(reference_id AS INTEGER)), 0) + 1
  INTO max_ref_id
  FROM public.leads
  WHERE reference_id ~ '^[0-9]+$';
  
  -- Reset the sequence to start from max + 1
  EXECUTE format('ALTER SEQUENCE public.lead_reference_id_seq RESTART WITH %s', max_ref_id);
END $$;