-- Backfill all lead_transfers with NULL store_id from their associated lead
UPDATE lead_transfers lt
SET store_id = l.store_id
FROM leads l
WHERE lt.lead_id = l.id
  AND lt.store_id IS NULL;