-- Fix search_path for generate_lead_reference_id function
CREATE OR REPLACE FUNCTION generate_lead_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get the next number in sequence for this store
  SELECT COALESCE(MAX(NULLIF(regexp_replace(reference_id, '[^0-9]', '', 'g'), '')::INTEGER), 0) + 1
  INTO next_num
  FROM public.leads
  WHERE store_id = NEW.store_id OR (NEW.store_id IS NULL AND store_id IS NULL);
  
  -- Format as 3-digit padded number (001, 002, etc.)
  NEW.reference_id := LPAD(next_num::TEXT, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;