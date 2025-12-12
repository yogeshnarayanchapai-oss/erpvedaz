-- Add store_id column to lead_transfers if not exists
ALTER TABLE lead_transfers ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id);

-- Backfill store_id from leads table
UPDATE lead_transfers lt 
SET store_id = l.store_id 
FROM leads l 
WHERE lt.lead_id = l.id AND lt.store_id IS NULL;

-- Create index for fast queries by to_user_id, transferred_at, store_id
CREATE INDEX IF NOT EXISTS idx_lead_transfers_to_user_date_store 
ON lead_transfers(to_user_id, transferred_at, store_id);

-- Create trigger function to record initial lead assignment in lead_transfers
CREATE OR REPLACE FUNCTION record_initial_lead_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Record initial assignment when lead is first assigned
  IF NEW.first_assigned_to_user_id IS NOT NULL AND 
     NOT EXISTS (SELECT 1 FROM lead_transfers WHERE lead_id = NEW.id) THEN
    INSERT INTO lead_transfers (
      lead_id, to_user_id, from_team, to_team, 
      transferred_by_user_id, transferred_at, store_id
    ) VALUES (
      NEW.id, NEW.first_assigned_to_user_id, 
      COALESCE(NEW.current_team, 'LEADS'), 'CALLING',
      COALESCE(NEW.created_by_user_id, NEW.first_assigned_to_user_id), 
      COALESCE(NEW.created_at, NOW()),
      NEW.store_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS trigger_record_initial_lead_transfer ON leads;
CREATE TRIGGER trigger_record_initial_lead_transfer
AFTER INSERT ON leads
FOR EACH ROW EXECUTE FUNCTION record_initial_lead_transfer();

-- Backfill missing lead_transfers records for existing leads
INSERT INTO lead_transfers (lead_id, to_user_id, from_team, to_team, transferred_by_user_id, transferred_at, store_id)
SELECT l.id, l.first_assigned_to_user_id, 'LEADS', 'CALLING', l.created_by_user_id, l.created_at, l.store_id
FROM leads l
WHERE l.first_assigned_to_user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM lead_transfers lt WHERE lt.lead_id = l.id
)
ON CONFLICT DO NOTHING;