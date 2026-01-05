-- Create enums for task priority and status
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority DEFAULT 'MEDIUM',
  status task_status DEFAULT 'PENDING',
  due_date DATE NOT NULL,
  assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  attachment_url TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create task status history table
CREATE TABLE public.task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  old_status task_status,
  new_status task_status NOT NULL,
  changed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Create task remarks table
CREATE TABLE public.task_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  remark TEXT NOT NULL,
  is_issue BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_remarks ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Admin/Manager/HR/Owner can view all tasks in their stores"
ON public.tasks FOR SELECT
USING (
  store_id IN (SELECT get_user_store_ids(auth.uid()))
  OR is_owner(auth.uid())
);

CREATE POLICY "Admin/Manager/HR/Owner can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'MANAGER') OR 
  has_role(auth.uid(), 'HR') OR 
  is_owner(auth.uid())
);

CREATE POLICY "Admin/Manager/HR/Owner can update any task"
ON public.tasks FOR UPDATE
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'MANAGER') OR 
  has_role(auth.uid(), 'HR') OR 
  is_owner(auth.uid()) OR
  assigned_to_user_id = auth.uid()
);

CREATE POLICY "Admin/Manager/HR/Owner can delete tasks"
ON public.tasks FOR DELETE
USING (
  has_role(auth.uid(), 'ADMIN') OR 
  has_role(auth.uid(), 'MANAGER') OR 
  has_role(auth.uid(), 'HR') OR 
  is_owner(auth.uid())
);

-- Task status history policies
CREATE POLICY "Users can view status history for accessible tasks"
ON public.task_status_history FOR SELECT
USING (
  task_id IN (SELECT id FROM public.tasks WHERE store_id IN (SELECT get_user_store_ids(auth.uid())))
  OR is_owner(auth.uid())
);

CREATE POLICY "Users can insert status history"
ON public.task_status_history FOR INSERT
WITH CHECK (
  task_id IN (SELECT id FROM public.tasks WHERE assigned_to_user_id = auth.uid())
  OR has_role(auth.uid(), 'ADMIN')
  OR has_role(auth.uid(), 'MANAGER')
  OR has_role(auth.uid(), 'HR')
  OR is_owner(auth.uid())
);

-- Task remarks policies
CREATE POLICY "Users can view remarks for accessible tasks"
ON public.task_remarks FOR SELECT
USING (
  task_id IN (SELECT id FROM public.tasks WHERE store_id IN (SELECT get_user_store_ids(auth.uid())))
  OR is_owner(auth.uid())
);

CREATE POLICY "Users can add remarks to their assigned tasks or if admin"
ON public.task_remarks FOR INSERT
WITH CHECK (
  task_id IN (SELECT id FROM public.tasks WHERE assigned_to_user_id = auth.uid())
  OR has_role(auth.uid(), 'ADMIN')
  OR has_role(auth.uid(), 'MANAGER')
  OR has_role(auth.uid(), 'HR')
  OR is_owner(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_remarks;

-- Create indexes for performance
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to_user_id);
CREATE INDEX idx_tasks_store_id ON public.tasks(store_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_remarks_task_id ON public.task_remarks(task_id);
CREATE INDEX idx_task_status_history_task_id ON public.task_status_history(task_id);