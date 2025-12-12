-- Add transaction_code column to party_transactions table
ALTER TABLE public.party_transactions
ADD COLUMN IF NOT EXISTS transaction_code TEXT;

-- Create function to generate transaction code for party_transactions
CREATE OR REPLACE FUNCTION public.generate_party_transaction_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
  store_id_val UUID;
BEGIN
  -- Get store_id from the party
  SELECT store_id INTO store_id_val FROM parties WHERE id = NEW.party_id;
  
  -- Get next sequence number for the store
  SELECT COALESCE(MAX(
    CASE 
      WHEN transaction_code ~ '^PT#[0-9]+$' 
      THEN CAST(SUBSTRING(transaction_code FROM 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO next_num
  FROM party_transactions pt
  JOIN parties p ON pt.party_id = p.id
  WHERE p.store_id = store_id_val;
  
  NEW.transaction_code := 'PT#' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

-- Create trigger for auto-generating transaction code
DROP TRIGGER IF EXISTS generate_party_transaction_code_trigger ON party_transactions;
CREATE TRIGGER generate_party_transaction_code_trigger
  BEFORE INSERT ON party_transactions
  FOR EACH ROW
  WHEN (NEW.transaction_code IS NULL)
  EXECUTE FUNCTION generate_party_transaction_code();

-- Backfill existing party_transactions with transaction codes
WITH numbered AS (
  SELECT 
    pt.id,
    p.store_id,
    ROW_NUMBER() OVER (PARTITION BY p.store_id ORDER BY pt.created_at) as rn
  FROM party_transactions pt
  JOIN parties p ON pt.party_id = p.id
  WHERE pt.transaction_code IS NULL
)
UPDATE party_transactions pt
SET transaction_code = 'PT#' || LPAD(numbered.rn::TEXT, 4, '0')
FROM numbered
WHERE pt.id = numbered.id;