-- Update RLS policies on transaction_categories to allow OWNER and ACCOUNTANT to manage categories

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage categories" ON transaction_categories;
DROP POLICY IF EXISTS "Staff can view categories" ON transaction_categories;

-- Create new policy that allows ADMIN, OWNER, and ACCOUNTANT to manage transaction categories
CREATE POLICY "Admins Owners Accountants can manage transaction categories" 
ON transaction_categories 
FOR ALL 
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ACCOUNTANT'::app_role)
);

-- Allow all authenticated users to view transaction categories
CREATE POLICY "Authenticated users can view transaction categories" 
ON transaction_categories 
FOR SELECT 
USING (true);

-- Also update parties table RLS for ACCOUNTANT role to create parties
DROP POLICY IF EXISTS "Admins can manage parties" ON parties;
DROP POLICY IF EXISTS "Staff can view parties" ON parties;

-- Create new policy that allows ADMIN, OWNER, and ACCOUNTANT to manage parties
CREATE POLICY "Admins Owners Accountants can manage parties" 
ON parties 
FOR ALL 
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ACCOUNTANT'::app_role)
);

-- Allow authenticated users to view parties
CREATE POLICY "Authenticated users can view parties" 
ON parties 
FOR SELECT 
USING (true);