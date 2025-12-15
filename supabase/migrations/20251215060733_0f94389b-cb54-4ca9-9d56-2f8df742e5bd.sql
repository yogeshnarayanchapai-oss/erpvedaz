-- Update the trigger function to include store_id when creating transaction from party payment
CREATE OR REPLACE FUNCTION create_accounting_transaction_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_id UUID;
  v_description TEXT;
  v_party_name TEXT;
BEGIN
  -- Get party name
  SELECT name INTO v_party_name FROM parties WHERE id = NEW.party_id;
  
  -- Create description
  IF NEW.payment_type = 'RECEIVED' THEN
    v_description := 'Payment received from ' || COALESCE(v_party_name, 'party');
  ELSE
    v_description := 'Payment made to ' || COALESCE(v_party_name, 'party');
  END IF;
  
  -- Insert into transactions table with lowercase type values
  INSERT INTO transactions (
    date,
    type,
    category_id,
    account_id,
    party_id,
    amount,
    description,
    note,
    is_cleared,
    store_id,
    created_at
  ) VALUES (
    NEW.date,
    CASE 
      WHEN NEW.payment_type = 'RECEIVED' THEN 'income'
      ELSE 'expense'
    END,
    NULL,
    NEW.bank_account_id,
    NEW.party_id,
    NEW.amount,
    v_description || COALESCE(' - ' || NEW.note, ''),
    NEW.note,
    true,
    NEW.store_id,
    now()
  ) RETURNING id INTO v_transaction_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;