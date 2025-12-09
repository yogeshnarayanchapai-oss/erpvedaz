-- Add reference_id column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS reference_id TEXT;

-- Create a sequence for generating lead reference IDs per store
CREATE SEQUENCE IF NOT EXISTS leads_reference_id_seq START WITH 1;

-- Create function to generate unique reference IDs for leads
CREATE OR REPLACE FUNCTION generate_lead_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  store_prefix TEXT;
BEGIN
  -- Get the next number in sequence for this store
  SELECT COALESCE(MAX(NULLIF(regexp_replace(reference_id, '[^0-9]', '', 'g'), '')::INTEGER), 0) + 1
  INTO next_num
  FROM leads
  WHERE store_id = NEW.store_id OR (NEW.store_id IS NULL AND store_id IS NULL);
  
  -- Format as 3-digit padded number (001, 002, etc.)
  NEW.reference_id := LPAD(next_num::TEXT, 3, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate reference_id on insert
DROP TRIGGER IF EXISTS trigger_generate_lead_reference_id ON leads;
CREATE TRIGGER trigger_generate_lead_reference_id
BEFORE INSERT ON leads
FOR EACH ROW
WHEN (NEW.reference_id IS NULL)
EXECUTE FUNCTION generate_lead_reference_id();

-- Backfill existing leads with reference IDs (ordered by created_at)
WITH numbered_leads AS (
  SELECT id, store_id,
    ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at) as row_num
  FROM leads
  WHERE reference_id IS NULL
)
UPDATE leads
SET reference_id = LPAD(numbered_leads.row_num::TEXT, 3, '0')
FROM numbered_leads
WHERE leads.id = numbered_leads.id;