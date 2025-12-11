-- Drop the existing policy and recreate with first_assigned_to_user_id for CALLING role
DROP POLICY IF EXISTS "leads_select_store_isolated" ON public.leads;

CREATE POLICY "leads_select_store_isolated" ON public.leads
FOR SELECT USING (
  is_owner(auth.uid()) OR 
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) AND (
    has_role(auth.uid(), 'ADMIN'::app_role) OR 
    has_role(auth.uid(), 'MANAGER'::app_role) OR
    (has_role(auth.uid(), 'LEADS'::app_role) AND ((current_team = 'LEADS') OR (pool_status = 'IN_POOL') OR (created_by_user_id = auth.uid()))) OR 
    (has_role(auth.uid(), 'CALLING'::app_role) AND (
      (assigned_to_user_id = auth.uid()) OR 
      (created_by_user_id = auth.uid()) OR
      (first_assigned_to_user_id = auth.uid())
    )) OR 
    (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND ((current_team = 'FOLLOWUP') OR (assigned_to_user_id = auth.uid()))) OR 
    (has_role(auth.uid(), 'LOGISTICS'::app_role) AND (status = 'CONFIRMED'))
  ))
);