-- Drop the existing constraint and add a new one that includes CUSTOMER
ALTER TABLE public.parties DROP CONSTRAINT IF EXISTS parties_party_type_check;

ALTER TABLE public.parties ADD CONSTRAINT parties_party_type_check 
CHECK (party_type = ANY (ARRAY['SUPPLIER'::text, 'WHOLESALER'::text, 'CUSTOMER'::text, 'BOTH'::text]));