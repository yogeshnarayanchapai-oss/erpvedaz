-- Drop existing update policy
DROP POLICY IF EXISTS "leads_update_store_isolated" ON public.leads;

-- Create new update policy that allows LEADS role to transfer leads
-- The key change: remove the with_check constraint for LEADS role transfers
-- by making the with_check clause more permissive for valid transfer operations
CREATE POLICY "leads_update_store_isolated" ON public.leads
FOR UPDATE
USING (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'MANAGER'::app_role)
    OR has_role(auth.uid(), 'OWNER'::app_role)
    OR (has_role(auth.uid(), 'LEADS'::app_role) AND (
      (current_team = 'LEADS'::team_type) 
      OR (pool_status = 'IN_POOL'::text) 
      OR (created_by_user_id = auth.uid())
    ))
    OR (has_role(auth.uid(), 'CALLING'::app_role) AND (assigned_to_user_id = auth.uid()))
    OR (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND (current_team = 'FOLLOWUP'::team_type))
  )
)
WITH CHECK (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'MANAGER'::app_role)
    OR has_role(auth.uid(), 'OWNER'::app_role)
    -- Allow LEADS role to transfer leads to CALLING team
    OR has_role(auth.uid(), 'LEADS'::app_role)
    -- CALLING can update their assigned leads
    OR (has_role(auth.uid(), 'CALLING'::app_role) AND (assigned_to_user_id = auth.uid()))
    -- FOLLOWUP can update followup team leads
    OR (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND (current_team = 'FOLLOWUP'::team_type))
  )
);