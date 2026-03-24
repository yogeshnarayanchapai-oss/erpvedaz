
-- Delete duplicate payroll records, keeping the oldest one
DELETE FROM payroll_records 
WHERE id NOT IN (
  SELECT DISTINCT ON (employee_id, month, store_id) id 
  FROM payroll_records 
  ORDER BY employee_id, month, store_id, created_at ASC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE payroll_records ADD CONSTRAINT payroll_records_employee_month_store_unique 
  UNIQUE (employee_id, month, store_id);
