-- =====================================================
-- MULTI-STORE ISOLATION: RLS POLICIES UPDATE
-- This migration implements full store-level data isolation
-- =====================================================

-- 1. Drop existing policies that need to be updated
DROP POLICY IF EXISTS "select_leads_by_role" ON public.leads;
DROP POLICY IF EXISTS "insert_leads_by_role" ON public.leads;
DROP POLICY IF EXISTS "update_leads_by_role" ON public.leads;
DROP POLICY IF EXISTS "delete_leads_by_role" ON public.leads;

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;
DROP POLICY IF EXISTS "LOGISTICS can update orders" ON public.orders;
DROP POLICY IF EXISTS "FOLLOWUP can redirect outside valley orders" ON public.orders;
DROP POLICY IF EXISTS "calling_can_update_own_orders_delivery" ON public.orders;

DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;

-- 2. Create helper function to check if user has access to a specific store
CREATE OR REPLACE FUNCTION public.user_has_store_access(p_user_id uuid, p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_store_access
    WHERE user_id = p_user_id
      AND store_id = p_store_id
      AND is_active = true
  ) OR is_owner(p_user_id)
$$;

-- 3. Create helper function to get all store IDs a user has access to
CREATE OR REPLACE FUNCTION public.get_user_store_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id
  FROM public.user_store_access
  WHERE user_id = p_user_id
    AND is_active = true
$$;

-- =====================================================
-- LEADS: Store-isolated RLS policies
-- =====================================================

CREATE POLICY "leads_select_store_isolated"
ON public.leads
FOR SELECT
USING (
  -- OWNER can see all leads but we enforce store context via app
  is_owner(auth.uid())
  OR
  -- Others can only see leads from their store
  (
    store_id IN (SELECT get_user_store_ids(auth.uid()))
    AND (
      has_role(auth.uid(), 'ADMIN'::app_role)
      OR (has_role(auth.uid(), 'LEADS'::app_role) AND (current_team = 'LEADS'::team_type OR created_by_user_id = auth.uid()))
      OR (has_role(auth.uid(), 'CALLING'::app_role) AND (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid()))
      OR (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND (current_team = 'FOLLOWUP'::team_type OR assigned_to_user_id = auth.uid()))
      OR (has_role(auth.uid(), 'LOGISTICS'::app_role) AND status = 'CONFIRMED'::lead_status)
      OR has_role(auth.uid(), 'MANAGER'::app_role)
    )
  )
);

CREATE POLICY "leads_insert_store_isolated"
ON public.leads
FOR INSERT
WITH CHECK (
  -- Must have access to the store
  (store_id IS NULL OR store_id IN (SELECT get_user_store_ids(auth.uid())) OR is_owner(auth.uid()))
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'OWNER'::app_role)
    OR (has_role(auth.uid(), 'LEADS'::app_role) AND created_by_user_id = auth.uid())
    OR (has_role(auth.uid(), 'CALLING'::app_role) AND created_by_user_id = auth.uid())
    OR (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND created_by_user_id = auth.uid())
    OR (has_role(auth.uid(), 'MANAGER'::app_role) AND created_by_user_id = auth.uid())
  )
);

CREATE POLICY "leads_update_store_isolated"
ON public.leads
FOR UPDATE
USING (
  -- Must have access to the store
  (store_id IN (SELECT get_user_store_ids(auth.uid())) OR is_owner(auth.uid()))
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'MANAGER'::app_role)
    OR has_role(auth.uid(), 'OWNER'::app_role)
    OR (has_role(auth.uid(), 'LEADS'::app_role) AND (current_team = 'LEADS'::team_type OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid()))
    OR (has_role(auth.uid(), 'CALLING'::app_role) AND assigned_to_user_id = auth.uid())
    OR (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND current_team = 'FOLLOWUP'::team_type)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'ADMIN'::app_role)
  OR has_role(auth.uid(), 'MANAGER'::app_role)
  OR has_role(auth.uid(), 'OWNER'::app_role)
  OR has_role(auth.uid(), 'LEADS'::app_role)
  OR has_role(auth.uid(), 'CALLING'::app_role)
  OR has_role(auth.uid(), 'FOLLOWUP'::app_role)
);

CREATE POLICY "leads_delete_store_isolated"
ON public.leads
FOR DELETE
USING (
  (store_id IN (SELECT get_user_store_ids(auth.uid())) OR is_owner(auth.uid()))
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- =====================================================
-- ORDERS: Store-isolated RLS policies
-- =====================================================

CREATE POLICY "orders_select_store_isolated"
ON public.orders
FOR SELECT
USING (
  is_owner(auth.uid())
  OR
  (
    store_id IN (SELECT get_user_store_ids(auth.uid()))
    AND (
      has_role(auth.uid(), 'ADMIN'::app_role)
      OR has_role(auth.uid(), 'MANAGER'::app_role)
      OR has_role(auth.uid(), 'LOGISTICS'::app_role)
      OR has_role(auth.uid(), 'FOLLOWUP'::app_role)
      OR sales_person_id = auth.uid()
      OR created_by_staff_id = auth.uid()
      OR assigned_to_user_id = auth.uid()
    )
  )
);

CREATE POLICY "orders_insert_store_isolated"
ON public.orders
FOR INSERT
WITH CHECK (
  (store_id IS NULL OR store_id IN (SELECT get_user_store_ids(auth.uid())) OR is_owner(auth.uid()))
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "orders_update_store_isolated"
ON public.orders
FOR UPDATE
USING (
  is_owner(auth.uid())
  OR
  (
    store_id IN (SELECT get_user_store_ids(auth.uid()))
    AND (
      has_role(auth.uid(), 'ADMIN'::app_role)
      OR has_role(auth.uid(), 'MANAGER'::app_role)
      OR has_role(auth.uid(), 'LOGISTICS'::app_role)
      OR (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND delivery_location = 'OUTSIDE_VALLEY')
      OR (has_role(auth.uid(), 'CALLING'::app_role) AND (sales_person_id = auth.uid() OR assigned_to_user_id = auth.uid()))
    )
  )
);

CREATE POLICY "orders_delete_store_isolated"
ON public.orders
FOR DELETE
USING (
  (store_id IN (SELECT get_user_store_ids(auth.uid())) OR is_owner(auth.uid()))
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);

-- =====================================================
-- NOTIFICATIONS: Store-isolated RLS policies
-- =====================================================

CREATE POLICY "notifications_select_store_isolated"
ON public.notifications
FOR SELECT
USING (
  -- OWNER sees all
  is_owner(auth.uid())
  OR
  -- Others see notifications targeted to them AND within their store
  (
    (target_user_id = auth.uid() OR target_role = (SELECT role::text FROM profiles WHERE id = auth.uid()))
    AND (store_id IS NULL OR store_id IN (SELECT get_user_store_ids(auth.uid())))
  )
);

CREATE POLICY "notifications_insert_store_isolated"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_update_store_isolated"
ON public.notifications
FOR UPDATE
USING (
  is_owner(auth.uid())
  OR
  (
    (target_user_id = auth.uid() OR target_role = (SELECT role::text FROM profiles WHERE id = auth.uid()))
    AND (store_id IS NULL OR store_id IN (SELECT get_user_store_ids(auth.uid())))
  )
);

CREATE POLICY "notifications_delete_store_isolated"
ON public.notifications
FOR DELETE
USING (
  (store_id IN (SELECT get_user_store_ids(auth.uid())) OR is_owner(auth.uid()))
  AND has_role(auth.uid(), 'ADMIN'::app_role)
);