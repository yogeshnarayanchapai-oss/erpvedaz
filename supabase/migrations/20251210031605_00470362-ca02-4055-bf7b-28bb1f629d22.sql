-- Make the trigger more robust to handle any potential conflicts
CREATE OR REPLACE FUNCTION public.generate_lead_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reference_id TEXT;
  v_max_existing INTEGER;
BEGIN
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    -- Get the maximum existing reference_id as integer
    SELECT COALESCE(MAX(CAST(reference_id AS INTEGER)), 0)
    INTO v_max_existing
    FROM public.leads
    WHERE reference_id ~ '^[0-9]+$';
    
    -- Use nextval but ensure it's always higher than max existing
    v_reference_id := LPAD(GREATEST(nextval('public.lead_reference_id_seq'), v_max_existing + 1)::TEXT, 4, '0');
    
    -- Update sequence if it was behind
    IF currval('public.lead_reference_id_seq') <= v_max_existing THEN
      PERFORM setval('public.lead_reference_id_seq', v_max_existing + 1, false);
    END IF;
    
    NEW.reference_id := v_reference_id;
  END IF;
  RETURN NEW;
END;
$function$;