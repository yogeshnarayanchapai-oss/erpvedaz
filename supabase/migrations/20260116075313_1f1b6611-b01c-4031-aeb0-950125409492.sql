-- Drop the old check constraint and add a new one that includes 'Late'
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_status_check 
  CHECK (status IN ('Present', 'Absent', 'Half-day', 'Leave', 'Work From Home', 'Late'));