
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
  v_adjust_plus numeric;
  v_adjust_minus numeric;
  v_new_balance numeric;
BEGIN
  SELECT COALESCE(opening_balance, 0) INTO v_opening_balance
  FROM accounts WHERE id = p_account_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_income_total
  FROM transactions WHERE account_id = p_account_id AND transaction_type = 'INCOME';

  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total
  FROM transactions WHERE account_id = p_account_id AND transaction_type = 'EXPENSE';

  SELECT COALESCE(SUM(amount), 0) INTO v_payment_in_total
  FROM transactions WHERE account_id = p_account_id AND transaction_type = 'PAYMENT_IN';

  SELECT COALESCE(SUM(amount), 0) INTO v_payment_out_total
  FROM transactions WHERE account_id = p_account_id AND transaction_type = 'PAYMENT_OUT';

  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_in
  FROM transactions WHERE to_account_id = p_account_id AND transaction_type = 'TRANSFER';

  SELECT COALESCE(SUM(amount), 0) INTO v_transfer_out
  FROM transactions WHERE from_account_id = p_account_id AND transaction_type = 'TRANSFER';

  SELECT COALESCE(SUM(amount), 0) INTO v_sales_out_cash
  FROM transactions WHERE account_id = p_account_id AND transaction_type = 'SALES_OUT';

  SELECT COALESCE(SUM(amount), 0) INTO v_sales_in_cash
  FROM transactions WHERE account_id = p_account_id AND transaction_type = 'SALES_IN';

  SELECT COALESCE(SUM(amount), 0) INTO v_adjust_plus
  FROM transactions WHERE account_id = p_account_id AND transaction_type = 'ADJUSTMENT_PLUS';

  SELECT COALESCE(SUM(amount), 0) INTO v_adjust_minus
  FROM transactions WHERE account_id = p_account_id AND transaction_type = 'ADJUSTMENT_MINUS';

  v_new_balance := v_opening_balance 
    + v_income_total 
    - v_expense_total 
    + v_payment_in_total 
    - v_payment_out_total
    + v_transfer_in 
    - v_transfer_out
    + v_sales_out_cash
    - v_sales_in_cash
    + v_adjust_plus
    - v_adjust_minus;

  UPDATE accounts
  SET current_balance = v_new_balance, updated_at = now()
  WHERE id = p_account_id;
END;
$function$;
