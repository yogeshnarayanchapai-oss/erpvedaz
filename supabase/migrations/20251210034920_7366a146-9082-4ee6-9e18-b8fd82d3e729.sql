-- Add is_duplicate column to leads table to mark duplicate phone numbers
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS is_duplicate boolean DEFAULT false;

-- Create index for faster duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_leads_contact_store 
ON public.leads(contact_number, store_id);

-- Create index for faster lookup of is_duplicate leads
CREATE INDEX IF NOT EXISTS idx_leads_is_duplicate 
ON public.leads(is_duplicate) WHERE is_duplicate = true;