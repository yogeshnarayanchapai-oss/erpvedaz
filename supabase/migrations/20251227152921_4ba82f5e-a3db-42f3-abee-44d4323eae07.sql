-- Fix the generate_lead_reference_id function to avoid timeouts
-- Use advisory lock to prevent race conditions instead of loop

CREATE OR REPLACE FUNCTION public.generate_lead_reference_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_next_val BIGINT;
BEGIN
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    -- Use advisory lock to prevent concurrent access issues
    PERFORM pg_advisory_xact_lock(hashtext('lead_reference_id'));
    
    -- Get next sequence value - this is already unique
    v_next_val := nextval('public.lead_reference_id_seq');
    NEW.reference_id := LPAD(v_next_val::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;