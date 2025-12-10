-- Drop and recreate the leads update policy to allow LEADS users to transfer leads to CALLING
DROP POLICY IF EXISTS "leads_update_store_isolated" ON public.leads;

CREATE POLICY "leads_update_store_isolated" ON public.leads
FOR UPDATE USING (
  -- Store isolation check
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    -- Admin/Manager/Owner can update any lead in their stores
    has_role(auth.uid(), 'ADMIN'::app_role) OR
    has_role(auth.uid(), 'MANAGER'::app_role) OR
    has_role(auth.uid(), 'OWNER'::app_role) OR
    -- LEADS can update leads in their team, in pool, or ones they created
    (has_role(auth.uid(), 'LEADS'::app_role) AND (
      current_team = 'LEADS'::team_type OR
      pool_status = 'IN_POOL' OR
      created_by_user_id = auth.uid()
    )) OR
    -- Calling staff can update their assigned leads
    (has_role(auth.uid(), 'CALLING'::app_role) AND assigned_to_user_id = auth.uid()) OR
    -- Followup can update leads in their team
    (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP'::team_type)
  )
)
WITH CHECK (
  -- Store isolation for new values
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    -- Admin/Manager/Owner can set any values
    has_role(auth.uid(), 'ADMIN'::app_role) OR
    has_role(auth.uid(), 'MANAGER'::app_role) OR
    has_role(auth.uid(), 'OWNER'::app_role) OR
    -- LEADS can transfer leads (even when new current_team becomes CALLING)
    has_role(auth.uid(), 'LEADS'::app_role) OR
    -- Calling can update their assigned leads
    (has_role(auth.uid(), 'CALLING'::app_role) AND assigned_to_user_id = auth.uid()) OR
    -- Followup can update their team leads
    (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP'::team_type)
  )
);