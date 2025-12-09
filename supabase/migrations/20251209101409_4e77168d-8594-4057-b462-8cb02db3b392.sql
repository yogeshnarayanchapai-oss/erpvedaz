-- Function to recalculate account balance from all related transactions
CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_opening_balance numeric;
  v_income_total numeric;
  v_expense_total numeric;
  v_new_balance numeric;
BEGIN
  -- Get opening balance
  SELECT COALESCE(opening_balance, 0) INTO v_opening_balance
  FROM accounts WHERE id = p_account_id;

  -- Calculate income from transactions table (income type with this account)
  SELECT COALESCE(SUM(amount), 0) INTO v_income_total
  FROM transactions
  WHERE account_id = p_account_id AND type = 'income' AND is_cleared = true;

  -- Calculate expense from transactions table (expense type with this account)
  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total
  FROM transactions
  WHERE account_id = p_account_id AND type = 'expense' AND is_cleared = true;

  -- Calculate new balance
  v_new_balance := v_opening_balance + v_income_total - v_expense_total;

  -- Update account balance
  UPDATE accounts
  SET current_balance = v_new_balance, updated_at = now()
  WHERE id = p_account_id;
END;
$$;

-- Trigger function for transactions table
CREATE OR REPLACE FUNCTION public.update_account_balance_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- On INSERT or UPDATE, recalculate for the new account
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(NEW.account_id);
    END IF;
    -- If account changed on UPDATE, also recalculate old account
    IF TG_OP = 'UPDATE' AND OLD.account_id IS NOT NULL AND OLD.account_id != NEW.account_id THEN
      PERFORM recalculate_account_balance(OLD.account_id);
    END IF;
    RETURN NEW;
  END IF;

  -- On DELETE, recalculate for the old account
  IF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(OLD.account_id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_transaction();

-- Trigger function for party_payments table
CREATE OR REPLACE FUNCTION public.update_account_balance_on_party_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- On INSERT or UPDATE, recalculate for the bank account
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.bank_account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(NEW.bank_account_id);
    END IF;
    -- If account changed on UPDATE, also recalculate old account
    IF TG_OP = 'UPDATE' AND OLD.bank_account_id IS NOT NULL AND OLD.bank_account_id != NEW.bank_account_id THEN
      PERFORM recalculate_account_balance(OLD.bank_account_id);
    END IF;
    RETURN NEW;
  END IF;

  -- On DELETE, recalculate for the old bank account
  IF TG_OP = 'DELETE' THEN
    IF OLD.bank_account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(OLD.bank_account_id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger on party_payments table
DROP TRIGGER IF EXISTS trigger_update_account_balance_on_payment ON party_payments;
CREATE TRIGGER trigger_update_account_balance_on_payment
AFTER INSERT OR UPDATE OR DELETE ON party_payments
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_party_payment();