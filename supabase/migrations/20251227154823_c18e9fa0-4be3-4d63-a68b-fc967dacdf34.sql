-- Make lead reference_id generation robust and future-proof
-- Fixes intermittent duplicate key errors by handling client-supplied reference_id safely

CREATE OR REPLACE FUNCTION public.generate_lead_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_val BIGINT;
BEGIN
  -- If client didn't provide reference_id, always generate from sequence (sequence is already concurrency-safe)
  IF NEW.reference_id IS NULL OR NEW.reference_id = '' THEN
    v_next_val := nextval('public.lead_reference_id_seq');
    NEW.reference_id := LPAD(v_next_val::TEXT, 4, '0');
    RETURN NEW;
  END IF;

  -- If client DID provide reference_id (imports / integrations), prevent duplicates:
  -- lock per provided value so concurrent inserts with same reference_id don't race.
  PERFORM pg_advisory_xact_lock(hashtext('lead_reference_id:' || NEW.reference_id));

  IF EXISTS (SELECT 1 FROM public.leads WHERE reference_id = NEW.reference_id) THEN
    v_next_val := nextval('public.lead_reference_id_seq');
    NEW.reference_id := LPAD(v_next_val::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$function$;

-- Re-sync sequence to current max numeric reference_id so future generated IDs remain compact
DO $$
DECLARE
  v_max_existing BIGINT;
BEGIN
  SELECT COALESCE(
    MAX(CASE WHEN reference_id ~ '^[0-9]+$' THEN reference_id::BIGINT END),
    0
  ) INTO v_max_existing
  FROM public.leads;

  PERFORM setval('public.lead_reference_id_seq', v_max_existing + 1, false);
END $$;