
-- Drop existing constraint if any
ALTER TABLE payroll_records DROP CONSTRAINT IF EXISTS payroll_records_employee_month_store_unique;

-- Delete the newer duplicates by ID
DELETE FROM payroll_records WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_id, month, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY created_at ASC) as rn
    FROM payroll_records
  ) sub WHERE rn > 1
);

-- Add unique constraint
CREATE UNIQUE INDEX payroll_records_employee_month_store_idx ON payroll_records (employee_id, month, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid));
