ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS consignment_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Backfill from existing single consignment_id
UPDATE public.transactions
SET consignment_ids = ARRAY[consignment_id]
WHERE consignment_id IS NOT NULL
  AND (consignment_ids IS NULL OR array_length(consignment_ids, 1) IS NULL);

CREATE INDEX IF NOT EXISTS idx_transactions_consignment_ids ON public.transactions USING GIN (consignment_ids);