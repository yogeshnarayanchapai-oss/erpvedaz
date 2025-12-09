
-- Add DELETE policies for OWNER role on accounting/party tables

-- transactions table
DROP POLICY IF EXISTS "Owner can delete transactions" ON public.transactions;
CREATE POLICY "Owner can delete transactions"
ON public.transactions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
    AND usa.store_role = 'OWNER'
  )
);

-- party_transactions table
DROP POLICY IF EXISTS "Owner can delete party transactions" ON public.party_transactions;
CREATE POLICY "Owner can delete party transactions"
ON public.party_transactions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
    AND usa.store_role = 'OWNER'
  )
);

-- party_payments table
DROP POLICY IF EXISTS "Owner can delete party payments" ON public.party_payments;
CREATE POLICY "Owner can delete party payments"
ON public.party_payments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid()
    AND usa.store_role = 'OWNER'
  )
);
