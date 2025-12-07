-- Drop the existing update policy
DROP POLICY IF EXISTS update_leads_by_role ON public.leads;

-- Create updated policy that allows CALLING users to update leads assigned to them
-- The policy checks the CURRENT state (before update), not the new state
CREATE POLICY update_leads_by_role ON public.leads
FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  has_role(auth.uid(), 'MANAGER'::app_role) OR
  has_role(auth.uid(), 'OWNER'::app_role) OR
  (has_role(auth.uid(), 'LEADS'::app_role) AND (
    current_team = 'LEADS'::team_type OR 
    pool_status = 'IN_POOL'::text OR 
    created_by_user_id = auth.uid()
  )) OR
  (has_role(auth.uid(), 'CALLING'::app_role) AND assigned_to_user_id = auth.uid()) OR
  (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP'::team_type AND (
    assigned_to_user_id = auth.uid() OR assigned_to_user_id IS NULL
  ))
)
WITH CHECK (true);