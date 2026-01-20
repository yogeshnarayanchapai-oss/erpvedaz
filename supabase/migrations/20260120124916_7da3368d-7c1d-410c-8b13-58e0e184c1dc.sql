-- Add high_alert_days column to cost_settings table for store-wise inventory high alert configuration
ALTER TABLE public.cost_settings 
ADD COLUMN IF NOT EXISTS high_alert_days integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.cost_settings.high_alert_days IS 'Number of days for high alert inventory calculation (1-60). NULL means high alert is disabled.';