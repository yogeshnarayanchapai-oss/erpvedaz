-- Add updated_at column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on every update
DROP TRIGGER IF EXISTS set_leads_updated_at ON public.leads;
CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leads_updated_at();

-- Initialize updated_at for existing rows based on most recent activity
UPDATE public.leads 
SET updated_at = GREATEST(
  COALESCE(last_called_at, created_at),
  COALESCE(assigned_at, created_at),
  COALESCE(confirmed_at, created_at),
  created_at
);