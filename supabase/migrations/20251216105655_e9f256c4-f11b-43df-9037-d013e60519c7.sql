-- Add lead_type column to track what type of transfer was done
ALTER TABLE public.lead_transfers 
ADD COLUMN IF NOT EXISTS lead_type text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.lead_transfers.lead_type IS 'Type of lead transfer: NEW, FOLLOW_UP_POOL, CNR_POOL, or REASSIGN for reassignments';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lead_transfers_lead_type ON public.lead_transfers(lead_type);