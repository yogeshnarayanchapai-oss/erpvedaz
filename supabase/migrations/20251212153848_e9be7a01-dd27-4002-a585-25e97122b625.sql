-- Fix account balance calculation to handle transfers (from_account_id, to_account_id)
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
  v_transfer_in numeric;
  v_transfer_out numeric;
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

  -- Calculate transfer IN (money coming INTO this account)
  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_in
  FROM transactions
  WHERE to_account_id = p_account_id AND type = 'transfer' AND is_cleared = true;

  -- Calculate transfer OUT (money going OUT of this account)
  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_out
  FROM transactions
  WHERE from_account_id = p_account_id AND type = 'transfer' AND is_cleared = true;

  -- Calculate new balance: opening + income + transfer_in - expense - transfer_out
  v_new_balance := v_opening_balance + v_income_total + v_transfer_in - v_expense_total - v_transfer_out;

  -- Update account balance
  UPDATE accounts
  SET current_balance = v_new_balance, updated_at = now()
  WHERE id = p_account_id;
END;
$$;

-- Update trigger function for transactions table to handle transfers
CREATE OR REPLACE FUNCTION public.update_account_balance_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- On INSERT or UPDATE, recalculate for affected accounts
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Handle regular account_id
    IF NEW.account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(NEW.account_id);
    END IF;
    
    -- Handle transfer from_account_id
    IF NEW.from_account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(NEW.from_account_id);
    END IF;
    
    -- Handle transfer to_account_id
    IF NEW.to_account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(NEW.to_account_id);
    END IF;
    
    -- If account changed on UPDATE, also recalculate old accounts
    IF TG_OP = 'UPDATE' THEN
      IF OLD.account_id IS NOT NULL AND (OLD.account_id != NEW.account_id OR NEW.account_id IS NULL) THEN
        PERFORM recalculate_account_balance(OLD.account_id);
      END IF;
      IF OLD.from_account_id IS NOT NULL AND (OLD.from_account_id != NEW.from_account_id OR NEW.from_account_id IS NULL) THEN
        PERFORM recalculate_account_balance(OLD.from_account_id);
      END IF;
      IF OLD.to_account_id IS NOT NULL AND (OLD.to_account_id != NEW.to_account_id OR NEW.to_account_id IS NULL) THEN
        PERFORM recalculate_account_balance(OLD.to_account_id);
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;

  -- On DELETE, recalculate for the old accounts
  IF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(OLD.account_id);
    END IF;
    IF OLD.from_account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(OLD.from_account_id);
    END IF;
    IF OLD.to_account_id IS NOT NULL THEN
      PERFORM recalculate_account_balance(OLD.to_account_id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_transaction();