-- Drop any existing update policy first to ensure clean state
DROP POLICY IF EXISTS update_leads_by_role ON public.leads;

-- Create the comprehensive update policy for leads
CREATE POLICY update_leads_by_role ON public.leads
FOR UPDATE 
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  has_role(auth.uid(), 'MANAGER'::app_role) OR
  has_role(auth.uid(), 'OWNER'::app_role) OR
  (has_role(auth.uid(), 'LEADS'::app_role) AND (
    current_team = 'LEADS'::team_type OR 
    pool_status = 'IN_POOL' OR 
    created_by_user_id = auth.uid()
  )) OR
  (has_role(auth.uid(), 'CALLING'::app_role) AND assigned_to_user_id = auth.uid()) OR
  (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP'::team_type)
)
WITH CHECK (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  has_role(auth.uid(), 'MANAGER'::app_role) OR
  has_role(auth.uid(), 'OWNER'::app_role) OR
  has_role(auth.uid(), 'LEADS'::app_role) OR
  has_role(auth.uid(), 'CALLING'::app_role) OR
  has_role(auth.uid(), 'FOLLOWUP'::app_role)
);