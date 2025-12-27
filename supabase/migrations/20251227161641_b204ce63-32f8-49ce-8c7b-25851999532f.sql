-- Update lead reference_id generation for scalability (लाखौं/करोडौं leads support)
-- Change from 5-digit to 8-digit LPAD to support up to 99,999,999 leads

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
  
  -- 8 digits supports up to 99,999,999 leads (करोड+)
  NEW.reference_id := LPAD(v_next_val::TEXT, 8, '0');
  
  RETURN NEW;
END;
$function$;