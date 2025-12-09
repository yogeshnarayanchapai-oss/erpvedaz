-- First clear existing reference_ids and regenerate globally unique ones
UPDATE leads SET reference_id = NULL;

-- Regenerate reference_ids globally unique (across all stores)
WITH numbered_leads AS (
  SELECT id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
  FROM leads
)
UPDATE leads
SET reference_id = LPAD(numbered_leads.row_num::TEXT, 4, '0')
FROM numbered_leads
WHERE leads.id = numbered_leads.id;

-- Update the trigger function to generate globally unique reference IDs
CREATE OR REPLACE FUNCTION generate_lead_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get the next global number (across ALL stores)
  SELECT COALESCE(MAX(NULLIF(regexp_replace(reference_id, '[^0-9]', '', 'g'), '')::INTEGER), 0) + 1
  INTO next_num
  FROM public.leads;
  
  -- Format as 4-digit padded number (0001, 0002, etc.)
  NEW.reference_id := LPAD(next_num::TEXT, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add unique constraint to ensure reference_id is always unique globally
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_reference_id_unique;
ALTER TABLE leads ADD CONSTRAINT leads_reference_id_unique UNIQUE (reference_id);