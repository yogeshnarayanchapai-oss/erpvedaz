-- Add office time settings to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS office_start_time time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS office_end_time time DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS grace_minutes integer DEFAULT 30;

-- Add late_minutes column to attendance_records
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS late_minutes integer DEFAULT NULL;

-- Update the status type to include 'Late' if not already included
DO $$
BEGIN
  -- Check if any existing record uses a different status set
  -- For now, we'll use a simple string field approach
END $$;

-- Add an index for efficient querying of attendance by date and status
CREATE INDEX IF NOT EXISTS idx_attendance_records_date_status 
ON public.attendance_records(date, status);

-- Add an index for efficient employee office time queries
CREATE INDEX IF NOT EXISTS idx_employees_store_status 
ON public.employees(store_id, status);