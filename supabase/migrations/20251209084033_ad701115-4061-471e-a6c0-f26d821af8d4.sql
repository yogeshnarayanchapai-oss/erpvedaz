-- Drop existing policies on transactions table
DROP POLICY IF EXISTS "Admins can manage transactions" ON transactions;
DROP POLICY IF EXISTS "Managers can view transactions" ON transactions;

-- Create new policy that allows ADMIN, OWNER, and ACCOUNTANT to manage transactions
CREATE POLICY "Admins Owners Accountants can manage transactions" 
ON transactions 
FOR ALL 
USING (
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'OWNER'::app_role) OR 
  has_role(auth.uid(), 'ACCOUNTANT'::app_role)
);

-- Allow MANAGER to view transactions
CREATE POLICY "Managers can view transactions" 
ON transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'MANAGER'::app_role));