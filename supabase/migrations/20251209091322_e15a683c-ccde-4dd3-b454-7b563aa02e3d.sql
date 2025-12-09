
-- Add transaction_code column with auto-increment sequence
CREATE SEQUENCE IF NOT EXISTS transaction_code_seq START WITH 1;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_code TEXT;

-- Create function to generate transaction code
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Get next sequence number for the store
  SELECT COALESCE(MAX(
    CASE 
      WHEN transaction_code ~ '^#[0-9]+$' 
      THEN CAST(SUBSTRING(transaction_code FROM 2) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO next_num
  FROM transactions
  WHERE store_id = NEW.store_id;
  
  NEW.transaction_code := '#' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-generating transaction code
DROP TRIGGER IF EXISTS set_transaction_code ON transactions;
CREATE TRIGGER set_transaction_code
  BEFORE INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.transaction_code IS NULL)
  EXECUTE FUNCTION generate_transaction_code();

-- Update existing transactions with codes
DO $$
DECLARE
  r RECORD;
  counter INTEGER;
  current_store UUID;
BEGIN
  current_store := NULL;
  counter := 0;
  
  FOR r IN 
    SELECT id, store_id 
    FROM transactions 
    WHERE transaction_code IS NULL 
    ORDER BY store_id, created_at
  LOOP
    IF current_store IS DISTINCT FROM r.store_id THEN
      current_store := r.store_id;
      counter := 0;
    END IF;
    
    counter := counter + 1;
    UPDATE transactions 
    SET transaction_code = '#' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;
