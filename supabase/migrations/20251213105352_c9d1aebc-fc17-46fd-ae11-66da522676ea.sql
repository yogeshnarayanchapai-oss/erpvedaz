-- Create storage bucket for employee documents if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('employee-docs', 'employee-docs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee-docs bucket
-- Allow employees to upload their own documents
CREATE POLICY "Employees can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'employee-docs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow employees to view their own documents
CREATE POLICY "Employees can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'employee-docs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'HR'::app_role)
    OR has_role(auth.uid(), 'OWNER'::app_role)
  )
);

-- Allow employees to update their own documents
CREATE POLICY "Employees can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'employee-docs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'HR'::app_role)
  )
);

-- Allow employees to delete their own documents
CREATE POLICY "Employees can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'employee-docs' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'HR'::app_role)
  )
);

-- Add employee_id column to hr_bank_accounts to link bank accounts to employees (instead of using bank_account_id in employees)
ALTER TABLE hr_bank_accounts ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id);
CREATE INDEX IF NOT EXISTS idx_hr_bank_accounts_employee_id ON hr_bank_accounts(employee_id);

-- Allow employees to insert their own bank accounts
CREATE POLICY "Employees can insert their own bank accounts" 
ON hr_bank_accounts 
FOR INSERT 
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

-- Allow employees to update their own bank accounts
CREATE POLICY "Employees can update their own bank accounts" 
ON hr_bank_accounts 
FOR UPDATE 
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Allow employees to delete their own bank accounts
CREATE POLICY "Employees can delete their own bank accounts" 
ON hr_bank_accounts 
FOR DELETE 
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Update SELECT policy to include employee_id based lookup
DROP POLICY IF EXISTS "Employees can view their own bank account" ON hr_bank_accounts;
CREATE POLICY "Employees can view their own bank accounts" 
ON hr_bank_accounts 
FOR SELECT 
USING (
  has_role(auth.uid(), 'ADMIN'::app_role)
  OR has_role(auth.uid(), 'HR'::app_role)
  OR has_role(auth.uid(), 'OWNER'::app_role)
  OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  OR id IN (SELECT bank_account_id FROM employees WHERE user_id = auth.uid())
);