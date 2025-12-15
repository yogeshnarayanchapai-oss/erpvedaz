-- Drop the duplicate trigger that directly modifies account balance
-- Balance updates should only happen through recalculate_account_balance via transactions trigger
DROP TRIGGER IF EXISTS party_payment_update_account ON public.party_payments;

-- Also drop the function if no other triggers use it
DROP FUNCTION IF EXISTS update_account_balance_on_payment();