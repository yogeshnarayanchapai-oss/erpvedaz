-- Drop existing policies on employees table
DROP POLICY IF EXISTS "Admins can manage employees in their stores" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;

-- Create new SELECT policy that allows:
-- 1. Users to view their own employee record
-- 2. OWNER to view all employees across all stores
-- 3. ADMIN/HR to view employees in stores they have access to
CREATE POLICY "employees_select_policy" ON public.employees
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'OWNER'::app_role)
  OR (
    (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
    AND (
      store_id IS NULL 
      OR store_id IN (
        SELECT usa.store_id FROM user_store_access usa 
        WHERE usa.user_id = auth.uid() AND usa.is_active = true
      )
    )
  )
);

-- Create INSERT policy that allows:
-- 1. OWNER can insert employees in any store
-- 2. ADMIN/HR can insert employees in stores they have access to
CREATE POLICY "employees_insert_policy" ON public.employees
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'OWNER'::app_role)
  OR (
    (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
    AND (
      store_id IS NULL 
      OR store_id IN (
        SELECT usa.store_id FROM user_store_access usa 
        WHERE usa.user_id = auth.uid() AND usa.is_active = true
      )
    )
  )
);

-- Create UPDATE policy that allows:
-- 1. OWNER can update employees in any store
-- 2. ADMIN/HR can update employees in stores they have access to
CREATE POLICY "employees_update_policy" ON public.employees
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'OWNER'::app_role)
  OR (
    (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
    AND (
      store_id IS NULL 
      OR store_id IN (
        SELECT usa.store_id FROM user_store_access usa 
        WHERE usa.user_id = auth.uid() AND usa.is_active = true
      )
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'OWNER'::app_role)
  OR (
    (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
    AND (
      store_id IS NULL 
      OR store_id IN (
        SELECT usa.store_id FROM user_store_access usa 
        WHERE usa.user_id = auth.uid() AND usa.is_active = true
      )
    )
  )
);

-- Create DELETE policy that allows:
-- 1. OWNER can delete employees in any store
-- 2. ADMIN/HR can delete employees in stores they have access to
CREATE POLICY "employees_delete_policy" ON public.employees
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'OWNER'::app_role)
  OR (
    (has_role(auth.uid(), 'ADMIN'::app_role) OR has_role(auth.uid(), 'HR'::app_role))
    AND (
      store_id IS NULL 
      OR store_id IN (
        SELECT usa.store_id FROM user_store_access usa 
        WHERE usa.user_id = auth.uid() AND usa.is_active = true
      )
    )
  )
);