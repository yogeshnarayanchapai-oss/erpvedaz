-- Simplify the leads UPDATE policy - USING validates access, WITH_CHECK validates new data
DROP POLICY IF EXISTS "leads_update_store_isolated" ON public.leads;

CREATE POLICY "leads_update_store_isolated" ON public.leads
FOR UPDATE TO authenticated
USING (
  -- WHO can update (before the update)
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
WITH CHECK (
  -- WHAT the new row can be - just ensure store_id stays valid
  (store_id IS NULL OR store_id IN (SELECT get_user_store_ids(auth.uid())) OR is_owner(auth.uid()))
);