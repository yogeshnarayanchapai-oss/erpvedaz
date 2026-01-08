-- Fix HRM RLS policies to be store-wise and include OWNER role
-- This ensures all HRM data is properly isolated by store and accessible by appropriate roles

-- ============================================
-- 1. LEAVE TYPES - Fix store-wise access
-- ============================================
DROP POLICY IF EXISTS "Admins can manage leave types" ON public.leave_types;
DROP POLICY IF EXISTS "Authenticated users can view leave types" ON public.leave_types;

-- Admin/Owner can manage leave types in their stores
CREATE POLICY "Admins can manage leave types in their stores"
ON public.leave_types
FOR ALL
TO public
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Users can view leave types in their stores
CREATE POLICY "Users can view leave types in their stores"
ON public.leave_types
FOR SELECT
TO public
USING (
  store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
);

-- ============================================
-- 2. DEPARTMENTS - Fix store-wise access
-- ============================================
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;

-- Admin/Owner/HR can manage departments in their stores
CREATE POLICY "Admins can manage departments in their stores"
ON public.departments
FOR ALL
TO public
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Users can view departments in their stores
CREATE POLICY "Users can view departments in their stores"
ON public.departments
FOR SELECT
TO public
USING (
  store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
);

-- ============================================
-- 3. HR POLICIES - Fix store-wise access
-- ============================================
DROP POLICY IF EXISTS "Admins can manage policies" ON public.hr_policies;
DROP POLICY IF EXISTS "Everyone can view active policies" ON public.hr_policies;

-- Admin/Owner can manage HR policies in their stores
CREATE POLICY "Admins can manage HR policies in their stores"
ON public.hr_policies
FOR ALL
TO public
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Users can view active HR policies in their stores
CREATE POLICY "Users can view HR policies in their stores"
ON public.hr_policies
FOR SELECT
TO public
USING (
  (is_active = true OR has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- ============================================
-- 4. OFFICE HOLIDAYS - Fix store-wise access
-- ============================================
DROP POLICY IF EXISTS "Admins can manage holidays" ON public.office_holidays;
DROP POLICY IF EXISTS "Authenticated users can view holidays" ON public.office_holidays;

-- Admin/Owner can manage holidays in their stores
CREATE POLICY "Admins can manage holidays in their stores"
ON public.office_holidays
FOR ALL
TO public
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Users can view holidays in their stores
CREATE POLICY "Users can view holidays in their stores"
ON public.office_holidays
FOR SELECT
TO public
USING (
  store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  )
);

-- ============================================
-- 5. EMPLOYEES - Fix store-wise access
-- ============================================
DROP POLICY IF EXISTS "Admins and HR can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;

-- Admin/Owner/HR can manage employees in their stores
CREATE POLICY "Admins can manage employees in their stores"
ON public.employees
FOR ALL
TO public
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Employees can view their own record
CREATE POLICY "Employees can view own record"
ON public.employees
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- ============================================
-- 6. LEAVE REQUESTS - Fix store-wise access
-- ============================================
DROP POLICY IF EXISTS "Admins HR and Manager can manage leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can create their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can view their own leave requests" ON public.leave_requests;

-- Admin/Owner/HR/Manager can manage leave requests in their stores
CREATE POLICY "Admins can manage leave requests in their stores"
ON public.leave_requests
FOR ALL
TO public
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role) OR has_role(auth.uid(), 'MANAGER'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role) OR has_role(auth.uid(), 'MANAGER'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Employees can create leave requests for themselves in their store
CREATE POLICY "Employees can create own leave requests"
ON public.leave_requests
FOR INSERT
TO public
WITH CHECK (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.user_id = auth.uid()
  )
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Employees can view their own leave requests
CREATE POLICY "Employees can view own leave requests"
ON public.leave_requests
FOR SELECT
TO public
USING (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.user_id = auth.uid()
  )
);

-- ============================================
-- 7. LEAVE QUOTA - Fix store-wise access
-- ============================================
DROP POLICY IF EXISTS "Admins and HR can manage leave quota" ON public.leave_quota;
DROP POLICY IF EXISTS "Employees can view their own quota" ON public.leave_quota;

-- Admin/Owner/HR can manage leave quota in their stores
CREATE POLICY "Admins can manage leave quota in their stores"
ON public.leave_quota
FOR ALL
TO public
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Employees can view their own quota
CREATE POLICY "Employees can view own leave quota"
ON public.leave_quota
FOR SELECT
TO public
USING (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.user_id = auth.uid()
  )
);

-- ============================================
-- 8. PAYROLL RECORDS - Fix store-wise access
-- ============================================
DROP POLICY IF EXISTS "Admins and HR can manage payroll" ON public.payroll_records;
DROP POLICY IF EXISTS "Employees can view their own payroll" ON public.payroll_records;

-- Admin/Owner/HR can manage payroll in their stores
CREATE POLICY "Admins can manage payroll in their stores"
ON public.payroll_records
FOR ALL
TO public
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'OWNER'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);

-- Employees can view their own payroll
CREATE POLICY "Employees can view own payroll"
ON public.payroll_records
FOR SELECT
TO public
USING (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.user_id = auth.uid()
  )
);