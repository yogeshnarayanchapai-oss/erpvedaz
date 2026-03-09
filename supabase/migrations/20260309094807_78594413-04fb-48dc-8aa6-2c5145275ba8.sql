
-- Delete today's auto-marked absent records for inactive employees
DELETE FROM attendance_records 
WHERE date = CURRENT_DATE 
AND status = 'Absent'
AND employee_id IN (
  SELECT id FROM employees WHERE status = 'Inactive'
);
