DROP POLICY IF EXISTS "Staff insert own submissions" ON public.daily_task_submissions;
DROP POLICY IF EXISTS "View submissions" ON public.daily_task_submissions;

CREATE POLICY "Staff insert own submissions"
ON public.daily_task_submissions
FOR INSERT TO authenticated
WITH CHECK (
  staff_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = daily_task_submissions.staff_id AND e.user_id = auth.uid())
  OR is_owner(auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['ADMIN'::app_role,'MANAGER'::app_role,'HR'::app_role]))
);

CREATE POLICY "View submissions"
ON public.daily_task_submissions
FOR SELECT TO authenticated
USING (
  staff_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = daily_task_submissions.staff_id AND e.user_id = auth.uid())
  OR is_owner(auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['ADMIN'::app_role,'MANAGER'::app_role,'HR'::app_role,'SALES_MANAGER'::app_role]))
);