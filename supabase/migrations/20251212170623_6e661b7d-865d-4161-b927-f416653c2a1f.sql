-- Add is_settled tracking to party_transactions
ALTER TABLE public.party_transactions
ADD COLUMN is_settled boolean DEFAULT false,
ADD COLUMN settled_at timestamp with time zone,
ADD COLUMN settled_account_id uuid REFERENCES public.accounts(id);

-- Create index for faster filtering
CREATE INDEX idx_party_transactions_is_settled ON public.party_transactions(is_settled);

COMMENT ON COLUMN public.party_transactions.is_settled IS 'Whether this transaction has been paid/received';
COMMENT ON COLUMN public.party_transactions.settled_at IS 'When the transaction was settled';
COMMENT ON COLUMN public.party_transactions.settled_account_id IS 'Account used to settle this transaction';