
-- ============================================
-- PHASE 1: Add new enum values + columns
-- ============================================

-- Add new enum values to transaction_type
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'SALES_IN';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'SALES_OUT';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'PAYMENT_IN';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'PAYMENT_OUT';

-- Add transaction_type column (text, will be set to NOT NULL after backfill)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type text;

-- Add reference columns for inventory links
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_type text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id text;

-- ============================================
-- PHASE 2: Backfill existing transactions
-- ============================================

-- Backfill transaction_type from type column
UPDATE transactions SET transaction_type = UPPER(type) WHERE transaction_type IS NULL;

-- Fix any invoice_receipt -> INCOME, bill_payment -> EXPENSE
UPDATE transactions SET transaction_type = 'INCOME' WHERE transaction_type = 'INVOICE_RECEIPT';
UPDATE transactions SET transaction_type = 'EXPENSE' WHERE transaction_type = 'BILL_PAYMENT';

-- Make transaction_type NOT NULL now that all rows are backfilled
ALTER TABLE transactions ALTER COLUMN transaction_type SET NOT NULL;

-- ============================================
-- PHASE 2b: Migrate party_transactions into transactions
-- ============================================

-- Migrate party_transactions into transactions table
-- PAYABLE (STOCK_IN) -> SALES_IN, RECEIVABLE (WHOLESALE_OUT) -> SALES_OUT
INSERT INTO transactions (
  date, type, transaction_type, amount, currency, account_id, party_id, 
  description, note, is_cleared, store_id, reference_type, reference_id
)
SELECT 
  pt.date,
  CASE WHEN pt.direction = 'PAYABLE' THEN 'expense' ELSE 'income' END,
  CASE WHEN pt.direction = 'PAYABLE' THEN 'SALES_IN' ELSE 'SALES_OUT' END,
  pt.amount,
  'NPR',
  pt.settled_account_id, -- NULL if not settled (credit entry)
  pt.party_id,
  pt.source || ' - ' || COALESCE((SELECT name FROM products WHERE id = pt.product_id), 'Product'),
  pt.remarks,
  COALESCE(pt.is_settled, false),
  pt.store_id,
  'stock_movement',
  pt.reference
FROM party_transactions pt
WHERE NOT EXISTS (
  -- Avoid duplicates: skip if a transaction with this reference already exists
  SELECT 1 FROM transactions t 
  WHERE t.reference_type = 'stock_movement' 
  AND t.reference_id = pt.reference
);

-- Update existing payment-trigger-created transactions to proper type
-- Transactions created by party_payment trigger have descriptions like "Payment received from..." or "Payment made to..."
UPDATE transactions 
SET transaction_type = 'PAYMENT_IN' 
WHERE description LIKE 'Payment received from%' AND transaction_type = 'INCOME';

UPDATE transactions 
SET transaction_type = 'PAYMENT_OUT' 
WHERE description LIKE 'Payment made to%' AND transaction_type = 'EXPENSE';

-- ============================================
-- PHASE 3: Rewrite recalculate_account_balance
-- ============================================

CREATE OR REPLACE FUNCTION public.recalculate_account_balance(p_account_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_opening_balance numeric;
  v_income_total numeric;
  v_expense_total numeric;
  v_payment_in_total numeric;
  v_payment_out_total numeric;
  v_transfer_in numeric;
  v_transfer_out numeric;
  v_sales_out_cash numeric;
  v_sales_in_cash numeric;
  v_new_balance numeric;
BEGIN
  -- Get opening balance
  SELECT COALESCE(opening_balance, 0) INTO v_opening_balance
  FROM accounts WHERE id = p_account_id;

  -- INCOME transactions with this account
  SELECT COALESCE(SUM(amount), 0) INTO v_income_total
  FROM transactions
  WHERE account_id = p_account_id AND transaction_type = 'INCOME';

  -- EXPENSE transactions with this account
  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total
  FROM transactions
  WHERE account_id = p_account_id AND transaction_type = 'EXPENSE';

  -- PAYMENT_IN transactions with this account
  SELECT COALESCE(SUM(amount), 0) INTO v_payment_in_total
  FROM transactions
  WHERE account_id = p_account_id AND transaction_type = 'PAYMENT_IN';

  -- PAYMENT_OUT transactions with this account
  SELECT COALESCE(SUM(amount), 0) INTO v_payment_out_total
  FROM transactions
  WHERE account_id = p_account_id AND transaction_type = 'PAYMENT_OUT';

  -- TRANSFER IN (money coming INTO this account)
  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_in
  FROM transactions
  WHERE to_account_id = p_account_id AND transaction_type = 'TRANSFER';

  -- TRANSFER OUT (money going OUT of this account)
  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_out
  FROM transactions
  WHERE from_account_id = p_account_id AND transaction_type = 'TRANSFER';

  -- SALES_OUT with account_id (cash sale mode)
  SELECT COALESCE(SUM(amount), 0) INTO v_sales_out_cash
  FROM transactions
  WHERE account_id = p_account_id AND transaction_type = 'SALES_OUT';

  -- SALES_IN with account_id (cash purchase mode)
  SELECT COALESCE(SUM(amount), 0) INTO v_sales_in_cash
  FROM transactions
  WHERE account_id = p_account_id AND transaction_type = 'SALES_IN';

  -- Calculate new balance
  v_new_balance := v_opening_balance 
    + v_income_total 
    - v_expense_total 
    + v_payment_in_total 
    - v_payment_out_total
    + v_transfer_in 
    - v_transfer_out
    + v_sales_out_cash
    - v_sales_in_cash;

  -- Update account balance
  UPDATE accounts
  SET current_balance = v_new_balance, updated_at = now()
  WHERE id = p_account_id;
END;
$function$;

-- ============================================
-- PHASE 4: Replace/Disable Old Triggers
-- ============================================

-- 4a: Remove party_payment triggers (stop new writes)
DROP TRIGGER IF EXISTS party_payment_create_transaction ON party_payments;
DROP TRIGGER IF EXISTS trigger_update_account_balance_on_payment ON party_payments;

-- 4b: Replace stock movement triggers to write to transactions instead of party_transactions

-- Drop old triggers first
DROP TRIGGER IF EXISTS create_party_tx_from_stock_insert ON stock_movements;
DROP TRIGGER IF EXISTS create_party_tx_from_stock_accounting_toggle ON stock_movements;
DROP TRIGGER IF EXISTS sync_party_tx_on_stock_update ON stock_movements;
DROP TRIGGER IF EXISTS sync_party_tx_on_stock_delete ON stock_movements;

-- New function: create transaction from stock movement (replaces create_party_transaction_from_stock_movement)
CREATE OR REPLACE FUNCTION public.create_transaction_from_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_store_id uuid;
  v_amount numeric;
  v_transaction_type text;
  v_type text;
  v_qty numeric;
  v_rate numeric;
  v_existing_tx_id uuid;
  v_product_name text;
BEGIN
  -- Handle toggle updates (related_to_accounting toggled off)
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.related_to_accounting, true) = true AND NEW.related_to_accounting = false THEN
      -- Delete linked transaction
      DELETE FROM public.transactions
      WHERE reference_type = 'stock_movement'
        AND reference_id = NEW.id::text;
      RETURN NEW;
    END IF;

    IF COALESCE(OLD.related_to_accounting, true) = false AND NEW.related_to_accounting = true THEN
      NULL; -- continue to create below
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- For INSERT, skip when explicitly disabled
  IF TG_OP = 'INSERT' AND NEW.related_to_accounting = false THEN
    RETURN NEW;
  END IF;

  -- Only process IN and WHOLESALE_OUT with party
  IF NEW.movement_type NOT IN ('IN', 'WHOLESALE_OUT') OR NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates
  SELECT id INTO v_existing_tx_id
  FROM public.transactions
  WHERE reference_type = 'stock_movement'
    AND reference_id = NEW.id::text
  LIMIT 1;

  IF v_existing_tx_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- store_id comes from party
  SELECT store_id INTO v_store_id FROM public.parties WHERE id = NEW.party_id;

  -- Get product name
  SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;

  v_qty := COALESCE(NEW.qty, 0);

  IF NEW.movement_type = 'IN' THEN
    v_transaction_type := 'SALES_IN';
    v_type := 'expense';
    v_rate := COALESCE(NEW.unit_cost, NEW.unit_price, 0);
  ELSE
    v_transaction_type := 'SALES_OUT';
    v_type := 'income';
    v_rate := COALESCE(NEW.unit_price, NEW.unit_cost, 0);
  END IF;

  v_amount := v_qty * v_rate;

  IF v_amount > 0 THEN
    INSERT INTO public.transactions (
      date,
      type,
      transaction_type,
      amount,
      currency,
      account_id,
      party_id,
      description,
      note,
      is_cleared,
      store_id,
      reference_type,
      reference_id
    ) VALUES (
      COALESCE(NEW.movement_date, CURRENT_DATE),
      v_type,
      v_transaction_type,
      v_amount,
      'NPR',
      NULL, -- credit mode by default (no account = doesn't affect balance)
      NEW.party_id,
      v_transaction_type || ' - ' || COALESCE(v_product_name, 'Product'),
      NEW.remark,
      false,
      v_store_id,
      'stock_movement',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- New function: sync transaction on stock update
CREATE OR REPLACE FUNCTION public.sync_transaction_on_stock_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id UUID;
  v_rate NUMERIC;
  v_new_amount NUMERIC;
BEGIN
  -- Only sync if party_id is set and movement type creates transactions
  IF NEW.party_id IS NOT NULL AND 
     NEW.movement_type IN ('IN', 'WHOLESALE_OUT') THEN
    
    -- Determine rate based on movement type
    IF NEW.movement_type = 'IN' THEN
      v_rate := COALESCE(NEW.unit_cost, 0);
    ELSE
      v_rate := COALESCE(NEW.unit_price, 0);
    END IF;
    
    v_new_amount := NEW.qty * v_rate;
    
    -- Check if any relevant field changed
    IF OLD.qty IS DISTINCT FROM NEW.qty 
       OR OLD.unit_price IS DISTINCT FROM NEW.unit_price
       OR OLD.unit_cost IS DISTINCT FROM NEW.unit_cost
       OR OLD.movement_date IS DISTINCT FROM NEW.movement_date
       OR OLD.remark IS DISTINCT FROM NEW.remark THEN
      
      -- Update the linked transaction
      UPDATE transactions
      SET 
        amount = v_new_amount,
        date = NEW.movement_date,
        note = NEW.remark
      WHERE reference_type = 'stock_movement'
        AND reference_id = NEW.id::text;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- New function: delete transaction on stock soft-delete
CREATE OR REPLACE FUNCTION public.sync_transaction_on_stock_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle soft delete (is_deleted = true)
  IF NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false) THEN
    IF NEW.party_id IS NOT NULL THEN
      DELETE FROM transactions
      WHERE reference_type = 'stock_movement'
        AND reference_id = NEW.id::text;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update block_stock_change_if_settled to check transactions instead of party_transactions
CREATE OR REPLACE FUNCTION public.block_stock_change_if_settled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_has_account BOOLEAN;
BEGIN
  -- Only check if party_id is set (has linked transaction)
  IF OLD.party_id IS NOT NULL THEN
    -- Check if linked transaction has account_id set (meaning it's been settled/paid)
    SELECT EXISTS(
      SELECT 1 FROM transactions
      WHERE reference_type = 'stock_movement'
        AND reference_id = OLD.id::text
        AND account_id IS NOT NULL
    ) INTO v_has_account;
    
    IF v_has_account THEN
      IF TG_OP = 'UPDATE' THEN
        IF OLD.qty IS DISTINCT FROM NEW.qty 
           OR OLD.unit_price IS DISTINCT FROM NEW.unit_price
           OR OLD.unit_cost IS DISTINCT FROM NEW.unit_cost
           OR (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted = true) THEN
          RAISE EXCEPTION 'This transaction is already cleared. Contact accountant to modify.';
        END IF;
      END IF;
      
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'This transaction is already cleared. Contact accountant to modify.';
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create new triggers on stock_movements
CREATE TRIGGER create_tx_from_stock_insert
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_from_stock_movement();

CREATE TRIGGER create_tx_from_stock_accounting_toggle
  AFTER UPDATE OF related_to_accounting ON stock_movements
  FOR EACH ROW
  WHEN (OLD.related_to_accounting IS DISTINCT FROM NEW.related_to_accounting)
  EXECUTE FUNCTION create_transaction_from_stock_movement();

CREATE TRIGGER sync_tx_on_stock_update
  AFTER UPDATE OF qty, unit_price, unit_cost, movement_date, remark ON stock_movements
  FOR EACH ROW
  WHEN (OLD.party_id IS NOT NULL)
  EXECUTE FUNCTION sync_transaction_on_stock_update();

CREATE TRIGGER sync_tx_on_stock_delete
  AFTER UPDATE OF is_deleted ON stock_movements
  FOR EACH ROW
  WHEN ((NEW.is_deleted = true) AND ((OLD.is_deleted IS NULL) OR (OLD.is_deleted = false)))
  EXECUTE FUNCTION sync_transaction_on_stock_delete();

-- 4c: Update balance trigger to use transaction_type (already uses the recalculate_account_balance function which is now updated)
-- The trigger itself doesn't need changes, just the function it calls

-- ============================================
-- Recalculate ALL account balances with new formula
-- ============================================
DO $$
DECLARE
  acc RECORD;
BEGIN
  FOR acc IN SELECT id FROM accounts WHERE is_active = true
  LOOP
    PERFORM recalculate_account_balance(acc.id);
  END LOOP;
END;
$$;
