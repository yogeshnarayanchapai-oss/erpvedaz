-- Add policy: Creators can see transfers of leads they created
-- This ensures LEADS users can see ALL transfers of leads they created,
-- even when reassigned by Admin/others
CREATE POLICY "Creators can view transfers of their leads"
ON lead_transfers FOR SELECT
USING (
  lead_id IN (
    SELECT id FROM leads WHERE created_by_user_id = auth.uid()
  )
);