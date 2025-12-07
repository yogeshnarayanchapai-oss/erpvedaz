-- Drop and recreate the update policy to allow LEADS role to manage all leads in their scope
DROP POLICY IF EXISTS update_leads_by_role ON public.leads;

-- Create updated policy that allows:
-- 1. ADMIN/MANAGER/OWNER can update any lead
-- 2. LEADS can update leads in their team, in pool, created by them, OR assigned to calling staff
-- 3. CALLING can update leads assigned to them
-- 4. FOLLOWUP can update leads in their team
CREATE POLICY update_leads_by_role ON public.leads
FOR UPDATE USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR
  has_role(auth.uid(), 'MANAGER'::app_role) OR
  has_role(auth.uid(), 'OWNER'::app_role) OR
  has_role(auth.uid(), 'LEADS'::app_role) OR
  (has_role(auth.uid(), 'CALLING'::app_role) AND assigned_to_user_id = auth.uid()) OR
  (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP'::team_type AND (
    assigned_to_user_id = auth.uid() OR assigned_to_user_id IS NULL
  ))
)
WITH CHECK (true);