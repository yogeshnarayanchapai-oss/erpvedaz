-- Update employees SELECT policy to include ACCOUNTANT role for payroll access
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;

CREATE POLICY "employees_select_policy"
ON public.employees
FOR SELECT
USING (
  -- Own employee record
  user_id = auth.uid()
  -- OR Owner sees all
  OR has_role(auth.uid(), 'OWNER'::app_role)
  -- OR Admin/HR/Accountant with store access
  OR (
    (has_role(auth.uid(), 'ADMIN'::app_role) OR 
     has_role(auth.uid(), 'HR'::app_role) OR
     has_role(auth.uid(), 'ACCOUNTANT'::app_role))
    AND (store_id IS NULL OR store_id IN (
      SELECT usa.store_id FROM user_store_access usa
      WHERE usa.user_id = auth.uid() AND usa.is_active = true
    ))
  )
);