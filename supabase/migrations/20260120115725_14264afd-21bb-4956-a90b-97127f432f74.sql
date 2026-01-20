-- Fix search_path for the new functions
ALTER FUNCTION create_holiday_attendance_records() SET search_path = public;
ALTER FUNCTION create_leave_attendance_records() SET search_path = public;
ALTER FUNCTION create_saturday_attendance_records(DATE) SET search_path = public;