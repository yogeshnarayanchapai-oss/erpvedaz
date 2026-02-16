
-- Add is_deleted and lead_data columns to socialbox_pulled_leads
ALTER TABLE public.socialbox_pulled_leads 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_data jsonb DEFAULT null;
