-- Issue #2 Fix: Lead visibility for LEAD role after transfer
-- LEAD role creators should NOT see leads after transfer (regardless of lead status)

-- Drop and recreate the leads SELECT policy
DROP POLICY IF EXISTS "leads_select_store_isolated" ON public.leads;

CREATE POLICY "leads_select_store_isolated" ON public.leads
FOR SELECT USING (
  is_owner(auth.uid()) 
  OR (
    (store_id IN (SELECT get_user_store_ids(auth.uid())))
    AND (
      has_store_role(auth.uid(), store_id, 'ADMIN'::app_role) OR
      has_store_role(auth.uid(), store_id, 'MANAGER'::app_role) OR
      -- LEADS can see: leads in LEADS team OR pool leads
      -- REMOVED: created_by_user_id condition (creators should NOT see after transfer)
      (has_store_role(auth.uid(), store_id, 'LEADS'::app_role) AND (
        (current_team = 'LEADS'::team_type) OR
        (pool_status = 'IN_POOL'::text)
      )) OR
      -- CALLING can see assigned leads, created leads, or first-assigned leads
      (has_store_role(auth.uid(), store_id, 'CALLING'::app_role) AND (
        (assigned_to_user_id = auth.uid()) OR 
        (created_by_user_id = auth.uid()) OR 
        (first_assigned_to_user_id = auth.uid())
      )) OR
      (has_store_role(auth.uid(), store_id, 'FOLLOWUP'::app_role) AND (
        (current_team = 'FOLLOWUP'::team_type) OR 
        (assigned_to_user_id = auth.uid())
      )) OR
      (has_store_role(auth.uid(), store_id, 'LOGISTICS'::app_role) AND (status = 'CONFIRMED'::lead_status))
    )
  )
);