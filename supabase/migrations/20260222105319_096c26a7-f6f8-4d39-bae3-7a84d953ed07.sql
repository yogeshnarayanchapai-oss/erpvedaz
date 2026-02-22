
-- Update source check constraint to allow 7 types
ALTER TABLE public.party_transactions DROP CONSTRAINT IF EXISTS party_transactions_source_check;
ALTER TABLE public.party_transactions ADD CONSTRAINT party_transactions_source_check 
  CHECK (source = ANY (ARRAY['STOCK_IN'::text, 'WHOLESALE_OUT'::text, 'ADJUSTMENT'::text, 'INCOME'::text, 'EXPENSE'::text, 'PAYMENT_IN'::text, 'PAYMENT_OUT'::text, 'SALE_IN'::text, 'SALE_OUT'::text]));
