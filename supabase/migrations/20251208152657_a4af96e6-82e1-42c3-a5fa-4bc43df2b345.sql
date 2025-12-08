-- Recreate orders UPDATE policy (it was dropped in failed migration)
DROP POLICY IF EXISTS "orders_update_store_isolated" ON public.orders;

CREATE POLICY "orders_update_store_isolated" ON public.orders
FOR UPDATE TO authenticated
USING (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role) OR
    has_role(auth.uid(), 'MANAGER'::app_role) OR
    has_role(auth.uid(), 'OWNER'::app_role) OR
    has_role(auth.uid(), 'LOGISTICS'::app_role) OR
    (has_role(auth.uid(), 'FOLLOWUP'::app_role) AND delivery_location = 'OUTSIDE_VALLEY') OR
    (has_role(auth.uid(), 'CALLING'::app_role) AND (sales_person_id = auth.uid() OR assigned_to_user_id = auth.uid()))
  )
)
WITH CHECK (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR is_owner(auth.uid()))
  AND (auth.uid() IS NOT NULL)
);

-- Recreate customers UPDATE policy
DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;

CREATE POLICY "Staff can update customers" ON public.customers
FOR UPDATE TO authenticated
USING (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR store_id IS NULL OR is_owner(auth.uid()))
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role) OR
    has_role(auth.uid(), 'CALLING'::app_role) OR
    has_role(auth.uid(), 'LOGISTICS'::app_role) OR
    has_role(auth.uid(), 'FOLLOWUP'::app_role) OR
    has_role(auth.uid(), 'MANAGER'::app_role) OR
    has_role(auth.uid(), 'OWNER'::app_role)
  )
)
WITH CHECK (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR store_id IS NULL OR is_owner(auth.uid()))
);

-- Fix notifications UPDATE policy with correct column name (target_user_id)
DROP POLICY IF EXISTS "notifications_update_store_isolated" ON public.notifications;

CREATE POLICY "notifications_update_store_isolated" ON public.notifications
FOR UPDATE TO authenticated
USING (
  is_owner(auth.uid()) OR 
  (
    ((target_user_id = auth.uid()) OR (target_role = (SELECT role::text FROM profiles WHERE id = auth.uid())))
    AND ((store_id IS NULL) OR (store_id IN (SELECT get_user_store_ids(auth.uid()))))
  )
)
WITH CHECK (
  is_owner(auth.uid()) OR 
  (
    ((target_user_id = auth.uid()) OR (target_role = (SELECT role::text FROM profiles WHERE id = auth.uid())))
    AND ((store_id IS NULL) OR (store_id IN (SELECT get_user_store_ids(auth.uid()))))
  )
);

-- Fix customers INSERT policy
DROP POLICY IF EXISTS "Staff can create customers" ON public.customers;

CREATE POLICY "Staff can create customers" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  ((store_id IN (SELECT get_user_store_ids(auth.uid()))) OR store_id IS NULL OR is_owner(auth.uid()))
  AND (
    has_role(auth.uid(), 'ADMIN'::app_role) OR
    has_role(auth.uid(), 'CALLING'::app_role) OR
    has_role(auth.uid(), 'LOGISTICS'::app_role) OR
    has_role(auth.uid(), 'FOLLOWUP'::app_role) OR
    has_role(auth.uid(), 'MANAGER'::app_role) OR
    has_role(auth.uid(), 'OWNER'::app_role)
  )
);