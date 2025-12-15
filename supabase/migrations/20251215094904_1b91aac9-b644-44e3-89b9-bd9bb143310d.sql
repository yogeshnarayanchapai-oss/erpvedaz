-- Add target_orders column to ad_spend_reference table
ALTER TABLE public.ad_spend_reference 
ADD COLUMN IF NOT EXISTS target_orders integer DEFAULT 0;