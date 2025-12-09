-- Create trigger to update account balance when transactions are inserted, updated, or deleted
DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;

CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance_on_transaction();