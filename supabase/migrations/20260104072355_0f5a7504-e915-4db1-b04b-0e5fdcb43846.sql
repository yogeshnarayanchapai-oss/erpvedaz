-- Drop existing opening_balance_type check constraint
ALTER TABLE public.parties DROP CONSTRAINT IF EXISTS parties_opening_balance_type_check;

-- Add updated check constraint that includes 'BOTH'
ALTER TABLE public.parties ADD CONSTRAINT parties_opening_balance_type_check 
  CHECK (opening_balance_type = ANY (ARRAY['RECEIVABLE'::text, 'PAYABLE'::text, 'BOTH'::text]));