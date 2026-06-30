
ALTER TABLE public.daily_task_submissions
  ADD COLUMN IF NOT EXISTS task_date DATE,
  ADD COLUMN IF NOT EXISTS checkin_time TIMESTAMPTZ;

ALTER TABLE public.daily_task_checkout_overrides
  ADD COLUMN IF NOT EXISTS task_date DATE,
  ADD COLUMN IF NOT EXISTS checkin_date DATE;

CREATE INDEX IF NOT EXISTS idx_dts_staff_taskdate ON public.daily_task_submissions(staff_id, task_date);
CREATE INDEX IF NOT EXISTS idx_dct_dept_active ON public.daily_checkout_tasks(department_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dct_staff_active ON public.daily_checkout_tasks(assigned_staff_id, is_active);
