CREATE POLICY "Authorized users can update task remarks"
ON public.task_remarks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_remarks.task_id
    AND (
      t.assigned_to_user_id = auth.uid()
      OR t.assigned_by_user_id = auth.uid()
      OR has_role(auth.uid(), 'ADMIN'::app_role)
      OR has_role(auth.uid(), 'MANAGER'::app_role)
      OR has_role(auth.uid(), 'HR'::app_role)
      OR is_owner(auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_remarks.task_id
    AND (
      t.assigned_to_user_id = auth.uid()
      OR t.assigned_by_user_id = auth.uid()
      OR has_role(auth.uid(), 'ADMIN'::app_role)
      OR has_role(auth.uid(), 'MANAGER'::app_role)
      OR has_role(auth.uid(), 'HR'::app_role)
      OR is_owner(auth.uid())
    )
  )
);