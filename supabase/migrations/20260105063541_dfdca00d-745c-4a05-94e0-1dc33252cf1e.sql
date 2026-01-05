-- Add parent_remark_id for replies to task_remarks
ALTER TABLE task_remarks ADD COLUMN parent_remark_id UUID REFERENCES task_remarks(id) ON DELETE CASCADE;

-- Create task_attachments table for links/files
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by_user_id UUID REFERENCES profiles(id),
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: View attachments for tasks in user's stores
CREATE POLICY "View attachments for accessible tasks"
ON task_attachments FOR SELECT
USING (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- Policy: Add attachments to accessible tasks (staff can add to their assigned tasks, admins to any)
CREATE POLICY "Add attachments to accessible tasks"
ON task_attachments FOR INSERT
WITH CHECK (store_id IN (SELECT get_user_store_ids(auth.uid())));

-- Policy: Delete own attachments
CREATE POLICY "Delete own attachments"
ON task_attachments FOR DELETE
USING (uploaded_by_user_id = auth.uid() OR 
  has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'MANAGER') OR has_role(auth.uid(), 'HR') OR is_owner(auth.uid()));