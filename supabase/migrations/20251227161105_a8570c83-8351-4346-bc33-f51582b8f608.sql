-- Fix lead reference_id generation - simplified and bulletproof approach
-- Remove all complexity, just use sequence directly (sequences are atomic)

CREATE OR REPLACE FUNCTION public.generate_lead_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_val BIGINT;
BEGIN
  -- Always generate from sequence - simple and bulletproof
  -- Ignore any client-provided reference_id to prevent duplicates
  v_next_val := nextval('public.lead_reference_id_seq');
  NEW.reference_id := LPAD(v_next_val::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;

-- Re-sync sequence to current max + 100 to ensure no conflicts
-- Using is_called = true so next nextval() returns value + 1
DO $$
DECLARE
  v_max_existing BIGINT;
  v_new_start BIGINT;
BEGIN
  SELECT COALESCE(
    MAX(CASE WHEN reference_id ~ '^[0-9]+$' THEN reference_id::BIGINT END),
    0
  ) INTO v_max_existing
  FROM public.leads;

  -- Set to max + 100 to give buffer, minimum 10000
  v_new_start := GREATEST(v_max_existing, 10000) + 100;
  
  -- is_called = true means next nextval() returns v_new_start + 1
  PERFORM setval('public.lead_reference_id_seq', v_new_start, true);
  
  RAISE NOTICE 'Sequence set to %, next ID will be %', v_new_start, v_new_start + 1;
END $$;