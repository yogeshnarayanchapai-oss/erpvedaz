-- Update the leads update policy to allow LEADS role to assign leads to calling staff
-- LEADS role should be able to update leads that are in the LEADS team pool (current_team = 'LEADS' or pool_status = 'IN_POOL')

DROP POLICY IF EXISTS "update_leads_by_role" ON public.leads;

CREATE POLICY "update_leads_by_role" ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  has_role(auth.uid(), 'MANAGER'::app_role) OR
  (has_role(auth.uid(), 'LEADS'::app_role) AND (current_team = 'LEADS' OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid())) OR
  (has_role(auth.uid(), 'CALLING'::app_role) AND assigned_to_user_id = auth.uid()) OR
  (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP' AND (assigned_to_user_id = auth.uid() OR assigned_to_user_id IS NULL))
)
WITH CHECK (true);