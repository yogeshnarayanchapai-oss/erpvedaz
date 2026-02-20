
-- ========================================================
-- PHASE 1: COMPLETE RLS ARCHITECTURE FIX
-- Replaces function calls with inline EXISTS checks
-- Adds optimized partial indexes
-- ========================================================

-- 1. Add partial index on user_store_access (active only)
CREATE INDEX IF NOT EXISTS idx_usa_active_user_role_store 
ON public.user_store_access (user_id, store_role, store_id) 
WHERE is_active = true;

-- ========================================================
-- 2. LEADS TABLE - Rewrite all 4 policies
-- ========================================================

DROP POLICY IF EXISTS "leads_select_store_isolated" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_store_isolated" ON public.leads;
DROP POLICY IF EXISTS "leads_update_store_isolated" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_store_isolated" ON public.leads;

-- SELECT: Complex role-based visibility
CREATE POLICY "leads_select_store_isolated" ON public.leads
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role)
  OR
  (
    EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true)
    AND
    (
      EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'MANAGER'::app_role))
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'MANAGER'::app_role))
      OR (
        (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'LEADS'::app_role)
         OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'LEADS'::app_role))
        AND (current_team = 'LEADS'::team_type OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid())
      )
      OR (
        (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'CALLING'::app_role)
         OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'CALLING'::app_role))
        AND (assigned_to_user_id = auth.uid() OR created_by_user_id = auth.uid() OR first_assigned_to_user_id = auth.uid())
      )
      OR (
        (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'FOLLOWUP'::app_role)
         OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'FOLLOWUP'::app_role))
        AND (current_team = 'FOLLOWUP'::team_type OR assigned_to_user_id = auth.uid())
      )
      OR (
        (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'LOGISTICS'::app_role)
         OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'LOGISTICS'::app_role))
        AND status = 'CONFIRMED'::lead_status
      )
    )
  )
);

-- INSERT
CREATE POLICY "leads_insert_store_isolated" ON public.leads
FOR INSERT TO authenticated
WITH CHECK (
  (store_id IS NULL OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true) OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role))
  AND
  (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'ADMIN'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'::app_role)
    OR (
      (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role IN ('LEADS'::app_role, 'CALLING'::app_role, 'FOLLOWUP'::app_role, 'MANAGER'::app_role))
       OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('LEADS'::app_role, 'CALLING'::app_role, 'FOLLOWUP'::app_role, 'MANAGER'::app_role)))
      AND created_by_user_id = auth.uid()
    )
  )
);

-- UPDATE
CREATE POLICY "leads_update_store_isolated" ON public.leads
FOR UPDATE TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true) OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role))
  AND
  (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'MANAGER'::app_role))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'MANAGER'::app_role))
    OR (
      (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'LEADS'::app_role)
       OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'LEADS'::app_role))
      AND (current_team = 'LEADS'::team_type OR pool_status = 'IN_POOL' OR created_by_user_id = auth.uid())
    )
    OR (
      (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'CALLING'::app_role)
       OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'CALLING'::app_role))
      AND assigned_to_user_id = auth.uid()
    )
    OR (
      (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'FOLLOWUP'::app_role)
       OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'FOLLOWUP'::app_role))
      AND current_team = 'FOLLOWUP'::team_type
    )
  )
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true) OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role))
  AND auth.uid() IS NOT NULL
);

-- DELETE
CREATE POLICY "leads_delete_store_isolated" ON public.leads
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role)
  OR (
    EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true)
    AND (
      EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leads.store_id AND usa.is_active = true AND usa.store_role = 'ADMIN'::app_role)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'::app_role)
    )
  )
);

-- ========================================================
-- 3. ORDERS TABLE - Rewrite all 4 policies
-- ========================================================

DROP POLICY IF EXISTS "orders_select_store_isolated" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_store_isolated" ON public.orders;
DROP POLICY IF EXISTS "orders_update_store_isolated" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_store_isolated" ON public.orders;

CREATE POLICY "orders_select_store_isolated" ON public.orders
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role)
  OR (
    EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true)
    AND (
      EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'LOGISTICS'::app_role, 'FOLLOWUP'::app_role))
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'LOGISTICS'::app_role, 'FOLLOWUP'::app_role))
      OR sales_person_id = auth.uid()
      OR created_by_staff_id = auth.uid()
      OR assigned_to_user_id = auth.uid()
    )
  )
);

CREATE POLICY "orders_insert_store_isolated" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  (store_id IS NULL OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true) OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role))
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "orders_update_store_isolated" ON public.orders
FOR UPDATE TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true) OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role))
  AND (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'LOGISTICS'::app_role))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'LOGISTICS'::app_role))
    OR (
      (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true AND usa.store_role = 'FOLLOWUP'::app_role)
       OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'FOLLOWUP'::app_role))
      AND delivery_location = 'OUTSIDE_VALLEY'
    )
    OR (
      (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true AND usa.store_role = 'CALLING'::app_role)
       OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'CALLING'::app_role))
      AND (sales_person_id = auth.uid() OR assigned_to_user_id = auth.uid())
    )
  )
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true) OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role))
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "orders_delete_store_isolated" ON public.orders
FOR DELETE TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true) OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role))
  AND (
    EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = orders.store_id AND usa.is_active = true AND usa.store_role = 'ADMIN'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'OWNER'::app_role))
  )
);

-- ========================================================
-- 4. TASKS TABLE - Rewrite all 4 policies
-- ========================================================

DROP POLICY IF EXISTS "Admin/Manager/HR/Owner can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin/Manager/HR/Owner can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin/Manager/HR/Owner can update any task" ON public.tasks;
DROP POLICY IF EXISTS "Admin/Manager/HR/Owner can view all tasks in their stores" ON public.tasks;

CREATE POLICY "tasks_select_policy" ON public.tasks
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'OWNER'::app_role)
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = tasks.store_id AND usa.is_active = true)
);

CREATE POLICY "tasks_insert_policy" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'HR'::app_role, 'OWNER'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = tasks.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'HR'::app_role))
);

CREATE POLICY "tasks_update_policy" ON public.tasks
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'HR'::app_role, 'OWNER'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = tasks.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'HR'::app_role))
  OR assigned_to_user_id = auth.uid()
);

CREATE POLICY "tasks_delete_policy" ON public.tasks
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'HR'::app_role, 'OWNER'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = tasks.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'MANAGER'::app_role, 'HR'::app_role))
);

-- ========================================================
-- 5. PRODUCT_INVENTORY TABLE - Rewrite policies
-- ========================================================

DROP POLICY IF EXISTS "ACCOUNTANT can view product_inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.product_inventory;
DROP POLICY IF EXISTS "OWNER ADMIN WAREHOUSE can manage product_inventory" ON public.product_inventory;

CREATE POLICY "inventory_select_policy" ON public.product_inventory
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "inventory_manage_policy" ON public.product_inventory
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('OWNER'::app_role, 'ADMIN'::app_role, 'WAREHOUSE'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'WAREHOUSE'::app_role))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('OWNER'::app_role, 'ADMIN'::app_role, 'WAREHOUSE'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'WAREHOUSE'::app_role))
);

-- ========================================================
-- 6. LEAVE_REQUESTS TABLE - Rewrite policies
-- ========================================================

DROP POLICY IF EXISTS "Admins can manage leave requests in their stores" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can create own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can view own leave requests" ON public.leave_requests;

CREATE POLICY "leave_requests_select_policy" ON public.leave_requests
FOR SELECT TO authenticated
USING (
  employee_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'OWNER'::app_role, 'HR'::app_role, 'MANAGER'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leave_requests.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'HR'::app_role, 'MANAGER'::app_role))
);

CREATE POLICY "leave_requests_insert_policy" ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (
  (employee_id IN (SELECT e.id FROM employees e WHERE e.user_id = auth.uid())
   AND (store_id IS NULL OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leave_requests.store_id AND usa.is_active = true)))
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'OWNER'::app_role, 'HR'::app_role, 'MANAGER'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leave_requests.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'HR'::app_role, 'MANAGER'::app_role))
);

CREATE POLICY "leave_requests_manage_policy" ON public.leave_requests
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'OWNER'::app_role, 'HR'::app_role, 'MANAGER'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leave_requests.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'HR'::app_role, 'MANAGER'::app_role))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN'::app_role, 'OWNER'::app_role, 'HR'::app_role, 'MANAGER'::app_role))
  OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid() AND usa.store_id = leave_requests.store_id AND usa.is_active = true AND usa.store_role IN ('ADMIN'::app_role, 'HR'::app_role, 'MANAGER'::app_role))
);

-- ========================================================
-- 7. ANALYZE critical tables
-- ========================================================
ANALYZE public.user_roles;
ANALYZE public.user_store_access;
ANALYZE public.leads;
ANALYZE public.orders;
ANALYZE public.tasks;
ANALYZE public.product_inventory;
ANALYZE public.leave_requests;
