-- Fix the generate_lead_reference_id function to handle bulk inserts properly
-- The issue is that concurrent inserts can get the same reference_id

CREATE OR REPLACE FUNCTION public.generate_lead_reference_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_reference_id TEXT;
  v_next_val BIGINT;
BEGIN
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    -- Use a loop to handle potential conflicts
    LOOP
      -- Get next sequence value
      v_next_val := nextval('public.lead_reference_id_seq');
      v_reference_id := LPAD(v_next_val::TEXT, 4, '0');
      
      -- Check if this reference_id already exists
      IF NOT EXISTS (SELECT 1 FROM public.leads WHERE reference_id = v_reference_id) THEN
        NEW.reference_id := v_reference_id;
        EXIT; -- Exit the loop if we found a unique value
      END IF;
      
      -- If exists, loop will continue and get next sequence value
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Also sync the sequence to be higher than any existing reference_id
DO $$
DECLARE
  v_max_existing INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(reference_id AS INTEGER)), 0)
  INTO v_max_existing
  FROM public.leads
  WHERE reference_id ~ '^[0-9]+$';
  
  -- Set sequence to max + 1 if current value is lower
  IF v_max_existing > 0 THEN
    PERFORM setval('public.lead_reference_id_seq', v_max_existing + 1, false);
  END IF;
END $$;