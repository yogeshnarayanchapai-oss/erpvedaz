-- Update payroll_records policy to include ACCOUNTANT role
DROP POLICY IF EXISTS "Admins can manage payroll in their stores" ON public.payroll_records;

CREATE POLICY "Admins and accountants can manage payroll in their stores"
ON public.payroll_records
FOR ALL
USING (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR 
   has_role(auth.uid(), 'OWNER'::app_role) OR 
   has_role(auth.uid(), 'HR'::app_role) OR
   has_role(auth.uid(), 'ACCOUNTANT'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
)
WITH CHECK (
  (has_role(auth.uid(), 'ADMIN'::app_role) OR 
   has_role(auth.uid(), 'OWNER'::app_role) OR 
   has_role(auth.uid(), 'HR'::app_role) OR
   has_role(auth.uid(), 'ACCOUNTANT'::app_role))
  AND (store_id IS NULL OR store_id IN (
    SELECT usa.store_id FROM user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.is_active = true
  ))
);