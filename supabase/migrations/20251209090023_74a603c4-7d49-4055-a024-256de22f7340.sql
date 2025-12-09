-- Add store_id to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Add store_id to transaction_categories table  
ALTER TABLE public.transaction_categories ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Add store_id to parties table
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Add store_id to party_transactions table
ALTER TABLE public.party_transactions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Add store_id to party_payments table
ALTER TABLE public.party_payments ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_store ON public.transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transaction_categories_store ON public.transaction_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_parties_store ON public.parties(store_id);
CREATE INDEX IF NOT EXISTS idx_party_transactions_store ON public.party_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_party_payments_store ON public.party_payments(store_id);