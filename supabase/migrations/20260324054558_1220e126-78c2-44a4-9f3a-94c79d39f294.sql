
-- First drop the constraint that was just added (it may have failed due to existing dupes)
ALTER TABLE payroll_records DROP CONSTRAINT IF EXISTS payroll_records_employee_month_store_unique;

-- Delete duplicates keeping earliest
DELETE FROM payroll_records a
USING payroll_records b
WHERE a.employee_id = b.employee_id 
  AND a.month = b.month 
  AND COALESCE(a.store_id::text, '') = COALESCE(b.store_id::text, '')
  AND a.created_at > b.created_at;

-- Now add unique constraint
ALTER TABLE payroll_records ADD CONSTRAINT payroll_records_employee_month_store_unique 
  UNIQUE (employee_id, month, store_id);
