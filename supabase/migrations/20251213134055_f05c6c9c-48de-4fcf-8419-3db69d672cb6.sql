-- Add targeting columns to notices table
ALTER TABLE public.notices 
ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'all' CHECK (target_type IN ('all', 'department', 'employee')),
ADD COLUMN IF NOT EXISTS target_department_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_employee_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS show_as_popup boolean DEFAULT false;

-- Create table to track dismissed notices per user
CREATE TABLE IF NOT EXISTS public.notice_dismissals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dismissed_at timestamp with time zone NOT NULL DEFAULT now(),
  store_id uuid REFERENCES public.stores(id),
  UNIQUE(notice_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notice_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can view their own dismissals
CREATE POLICY "Users can view own dismissals" ON public.notice_dismissals
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own dismissals
CREATE POLICY "Users can dismiss notices" ON public.notice_dismissals
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notice_dismissals_user ON public.notice_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_notice_dismissals_notice ON public.notice_dismissals(notice_id);