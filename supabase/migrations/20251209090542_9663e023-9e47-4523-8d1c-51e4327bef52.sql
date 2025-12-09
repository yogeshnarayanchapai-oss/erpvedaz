
-- Drop and recreate policies for accounts table to include ACCOUNTANT role
DROP POLICY IF EXISTS "Users can view accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete accounts" ON accounts;

CREATE POLICY "Users can view accounts" ON accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    )
  );

CREATE POLICY "Users can insert accounts" ON accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can update accounts" ON accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can delete accounts" ON accounts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

-- Drop and recreate policies for transactions table
DROP POLICY IF EXISTS "Users can view transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions" ON transactions;

CREATE POLICY "Users can view transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    )
  );

CREATE POLICY "Users can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can update transactions" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can delete transactions" ON transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

-- Drop and recreate policies for transaction_categories table
DROP POLICY IF EXISTS "Users can view transaction_categories" ON transaction_categories;
DROP POLICY IF EXISTS "Users can insert transaction_categories" ON transaction_categories;
DROP POLICY IF EXISTS "Users can update transaction_categories" ON transaction_categories;
DROP POLICY IF EXISTS "Users can delete transaction_categories" ON transaction_categories;

CREATE POLICY "Users can view transaction_categories" ON transaction_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    )
  );

CREATE POLICY "Users can insert transaction_categories" ON transaction_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can update transaction_categories" ON transaction_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can delete transaction_categories" ON transaction_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

-- Drop and recreate policies for parties table
DROP POLICY IF EXISTS "Users can view parties" ON parties;
DROP POLICY IF EXISTS "Users can insert parties" ON parties;
DROP POLICY IF EXISTS "Users can update parties" ON parties;
DROP POLICY IF EXISTS "Users can delete parties" ON parties;

CREATE POLICY "Users can view parties" ON parties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    )
  );

CREATE POLICY "Users can insert parties" ON parties
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can update parties" ON parties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can delete parties" ON parties
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

-- Drop and recreate policies for party_transactions table
DROP POLICY IF EXISTS "Users can view party_transactions" ON party_transactions;
DROP POLICY IF EXISTS "Users can insert party_transactions" ON party_transactions;
DROP POLICY IF EXISTS "Users can update party_transactions" ON party_transactions;
DROP POLICY IF EXISTS "Users can delete party_transactions" ON party_transactions;

CREATE POLICY "Users can view party_transactions" ON party_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    )
  );

CREATE POLICY "Users can insert party_transactions" ON party_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can update party_transactions" ON party_transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can delete party_transactions" ON party_transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

-- Drop and recreate policies for party_payments table
DROP POLICY IF EXISTS "Users can view party_payments" ON party_payments;
DROP POLICY IF EXISTS "Users can insert party_payments" ON party_payments;
DROP POLICY IF EXISTS "Users can update party_payments" ON party_payments;
DROP POLICY IF EXISTS "Users can delete party_payments" ON party_payments;

CREATE POLICY "Users can view party_payments" ON party_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    )
  );

CREATE POLICY "Users can insert party_payments" ON party_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can update party_payments" ON party_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

CREATE POLICY "Users can delete party_payments" ON party_payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );

-- Drop and recreate policies for accounting_activity_logs table
DROP POLICY IF EXISTS "OWNER, ACCOUNTANT, ADMIN can view activity logs" ON accounting_activity_logs;
DROP POLICY IF EXISTS "OWNER, ACCOUNTANT can insert activity logs" ON accounting_activity_logs;

CREATE POLICY "OWNER, ACCOUNTANT, ADMIN can view activity logs" ON accounting_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ADMIN', 'ACCOUNTANT')
    )
  );

CREATE POLICY "OWNER, ACCOUNTANT can insert activity logs" ON accounting_activity_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('OWNER', 'ACCOUNTANT')
    )
  );
