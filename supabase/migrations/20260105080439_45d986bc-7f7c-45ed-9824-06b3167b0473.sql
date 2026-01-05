-- Create backup_logs table to track backup history
CREATE TABLE public.backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' or 'manual'
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'success', 'failed'
  file_name TEXT,
  file_size BIGINT,
  google_drive_id TEXT,
  google_drive_url TEXT,
  tables_backed_up INTEGER,
  total_rows BIGINT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Only ADMIN/OWNER can view backup logs
CREATE POLICY "Admin users can view backup logs"
ON public.backup_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ADMIN', 'OWNER')
  )
);

-- Only system (service role) can insert/update backup logs
CREATE POLICY "Service role can manage backup logs"
ON public.backup_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_backup_logs_created_at ON public.backup_logs(created_at DESC);
CREATE INDEX idx_backup_logs_status ON public.backup_logs(status);