-- Drop the existing foreign key constraint and recreate with ON DELETE CASCADE
ALTER TABLE hr_bank_accounts 
DROP CONSTRAINT IF EXISTS hr_bank_accounts_employee_id_fkey;

ALTER TABLE hr_bank_accounts 
ADD CONSTRAINT hr_bank_accounts_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Also add CASCADE for other tables that reference employees
ALTER TABLE attendance_records 
DROP CONSTRAINT IF EXISTS attendance_records_employee_id_fkey;

ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE payroll_records 
DROP CONSTRAINT IF EXISTS payroll_records_employee_id_fkey;

ALTER TABLE payroll_records 
ADD CONSTRAINT payroll_records_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE leave_requests 
DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey;

ALTER TABLE leave_requests 
ADD CONSTRAINT leave_requests_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE asset_assignments 
DROP CONSTRAINT IF EXISTS asset_assignments_employee_id_fkey;

ALTER TABLE asset_assignments 
ADD CONSTRAINT asset_assignments_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE employee_documents 
DROP CONSTRAINT IF EXISTS employee_documents_employee_id_fkey;

ALTER TABLE employee_documents 
ADD CONSTRAINT employee_documents_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE leave_quota 
DROP CONSTRAINT IF EXISTS leave_quota_employee_id_fkey;

ALTER TABLE leave_quota 
ADD CONSTRAINT leave_quota_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;