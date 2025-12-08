
-- Make WITH CHECK permissive - USING already validates who can update
DROP POLICY IF EXISTS "leads_update_store_isolated" ON public.leads;

CREATE POLICY "leads_update_store_isolated" ON public.leads
FOR UPDATE TO authenticated
USING (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role) OR
    has_role(auth.uid(), 'MANAGER'::app_role) OR
    has_role(auth.uid(), 'OWNER'::app_role) OR
    (has_role(auth.uid(), 'LEADS'::app_role) AND (current_team = 'LEADS' OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid())) OR
    (has_role(auth.uid(), 'CALLING'::app_role) AND assigned_to_user_id = auth.uid()) OR
    (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP')
  )
)
WITH CHECK (true);
