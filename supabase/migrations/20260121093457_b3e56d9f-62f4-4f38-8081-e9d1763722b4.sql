-- Drop and recreate the INSERT policy for task_remarks to allow:
-- 1. The assigned user (assigned_to)
-- 2. The assigner (assigned_by) 
-- 3. Any ADMIN, MANAGER, HR, or OWNER role
DROP POLICY IF EXISTS "Users can add remarks to their assigned tasks or if admin" ON public.task_remarks;

CREATE POLICY "Users can add remarks to accessible tasks"
ON public.task_remarks
FOR INSERT
WITH CHECK (
  -- Get the task to check assignment and store
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id
    AND (
      -- User is assigned to this task
      t.assigned_to_user_id = auth.uid()
      -- OR user assigned this task (the assigner)
      OR t.assigned_by_user_id = auth.uid()
      -- OR user has appropriate role
      OR has_role(auth.uid(), 'ADMIN'::app_role)
      OR has_role(auth.uid(), 'MANAGER'::app_role)
      OR has_role(auth.uid(), 'HR'::app_role)
      OR is_owner(auth.uid())
    )
  )
);