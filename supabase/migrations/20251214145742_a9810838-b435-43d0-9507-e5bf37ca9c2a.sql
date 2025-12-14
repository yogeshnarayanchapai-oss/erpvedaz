-- Drop existing policies and recreate with store-aware role checks
-- The key change: instead of has_role(auth.uid(), 'ADMIN'), we check if user has ADMIN store_role for the row's store_id

-- LEADS TABLE POLICIES
DROP POLICY IF EXISTS "leads_select_store_isolated" ON public.leads;
CREATE POLICY "leads_select_store_isolated" ON public.leads FOR SELECT USING (
  is_owner(auth.uid()) 
  OR (
    (store_id IN (SELECT get_user_store_ids(auth.uid())))
    AND (
      -- Admin access for this store (global ADMIN or store_role = ADMIN)
      has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
      OR has_store_role(auth.uid(), store_id, 'MANAGER'::app_role)
      -- LEADS role access
      OR (has_store_role(auth.uid(), store_id, 'LEADS'::app_role) AND (
        current_team = 'LEADS' OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid()
      ))
      -- CALLING role access
      OR (has_store_role(auth.uid(), store_id, 'CALLING'::app_role) AND (
        assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid() OR first_assigned_to_user_id = auth.uid()
      ))
      -- FOLLOWUP role access
      OR (has_store_role(auth.uid(), store_id, 'FOLLOWUP'::app_role) AND (
        current_team = 'FOLLOWUP' OR assigned_to_user_id = auth.uid()
      ))
      -- LOGISTICS can see confirmed leads
      OR (has_store_role(auth.uid(), store_id, 'LOGISTICS'::app_role) AND status = 'CONFIRMED')
    )
  )
);

DROP POLICY IF EXISTS "leads_update_store_isolated" ON public.leads;
CREATE POLICY "leads_update_store_isolated" ON public.leads FOR UPDATE USING (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
    OR has_store_role(auth.uid(), store_id, 'MANAGER'::app_role)
    OR is_owner(auth.uid())
    OR (has_store_role(auth.uid(), store_id, 'LEADS'::app_role) AND (
      current_team = 'LEADS' OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid()
    ))
    OR (has_store_role(auth.uid(), store_id, 'CALLING'::app_role) AND assigned_to_user_id = auth.uid())
    OR (has_store_role(auth.uid(), store_id, 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP')
  )
) WITH CHECK (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
    OR has_store_role(auth.uid(), store_id, 'MANAGER'::app_role)
    OR is_owner(auth.uid())
    OR has_store_role(auth.uid(), store_id, 'LEADS'::app_role)
    OR (has_store_role(auth.uid(), store_id, 'CALLING'::app_role) AND assigned_to_user_id = auth.uid())
    OR (has_store_role(auth.uid(), store_id, 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP')
  )
);

DROP POLICY IF EXISTS "leads_delete_store_isolated" ON public.leads;
CREATE POLICY "leads_delete_store_isolated" ON public.leads FOR DELETE USING (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
);

DROP POLICY IF EXISTS "leads_insert_store_isolated" ON public.leads;
CREATE POLICY "leads_insert_store_isolated" ON public.leads FOR INSERT WITH CHECK (
  ((store_id IS NULL) OR (store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
    OR is_owner(auth.uid())
    OR (has_store_role(auth.uid(), store_id, 'LEADS'::app_role) AND created_by_user_id = auth.uid())
    OR (has_store_role(auth.uid(), store_id, 'CALLING'::app_role) AND created_by_user_id = auth.uid())
    OR (has_store_role(auth.uid(), store_id, 'FOLLOWUP'::app_role) AND created_by_user_id = auth.uid())
    OR (has_store_role(auth.uid(), store_id, 'MANAGER'::app_role) AND created_by_user_id = auth.uid())
  )
);

-- ORDERS TABLE POLICIES
DROP POLICY IF EXISTS "orders_select_store_isolated" ON public.orders;
CREATE POLICY "orders_select_store_isolated" ON public.orders FOR SELECT USING (
  is_owner(auth.uid())
  OR (
    (store_id IN (SELECT get_user_store_ids(auth.uid())))
    AND (
      has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
      OR has_store_role(auth.uid(), store_id, 'MANAGER'::app_role)
      OR has_store_role(auth.uid(), store_id, 'LOGISTICS'::app_role)
      OR has_store_role(auth.uid(), store_id, 'FOLLOWUP'::app_role)
      OR sales_person_id = auth.uid()
      OR created_by_staff_id = auth.uid()
      OR assigned_to_user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "orders_update_store_isolated" ON public.orders;
CREATE POLICY "orders_update_store_isolated" ON public.orders FOR UPDATE USING (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
    OR has_store_role(auth.uid(), store_id, 'MANAGER'::app_role)
    OR is_owner(auth.uid())
    OR has_store_role(auth.uid(), store_id, 'LOGISTICS'::app_role)
    OR (has_store_role(auth.uid(), store_id, 'FOLLOWUP'::app_role) AND delivery_location = 'OUTSIDE_VALLEY')
    OR (has_store_role(auth.uid(), store_id, 'CALLING'::app_role) AND (sales_person_id = auth.uid() OR assigned_to_user_id = auth.uid()))
  )
) WITH CHECK (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "orders_delete_store_isolated" ON public.orders;
CREATE POLICY "orders_delete_store_isolated" ON public.orders FOR DELETE USING (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND has_store_role(auth.uid(), store_id, 'ADMIN'::app_role)
);