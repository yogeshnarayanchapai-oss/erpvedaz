
-- Drop the old check constraint and add new one with additional statuses
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;

-- Add new check constraint with Saturday, Holiday, Leave statuses
ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_status_check 
CHECK (status IN ('Present', 'Absent', 'Late', 'Half-day', 'Work From Home', 'Saturday', 'Holiday', 'Leave'));
