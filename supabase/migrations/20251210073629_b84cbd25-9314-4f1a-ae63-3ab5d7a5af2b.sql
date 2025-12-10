-- Add first_assigned_to_user_id column to track original assignment (never changes after first assignment)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS first_assigned_to_user_id UUID REFERENCES auth.users(id);

-- Backfill existing data: set first_assigned_to_user_id to current assigned_to_user_id for all leads
UPDATE public.leads 
SET first_assigned_to_user_id = assigned_to_user_id 
WHERE first_assigned_to_user_id IS NULL AND assigned_to_user_id IS NOT NULL;

-- Create trigger function to set first_assigned_to_user_id only on first assignment
CREATE OR REPLACE FUNCTION public.set_first_assigned_to_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set first_assigned_to_user_id if it's not already set and we're assigning to someone
  IF NEW.assigned_to_user_id IS NOT NULL AND (OLD.first_assigned_to_user_id IS NULL OR OLD IS NULL) THEN
    NEW.first_assigned_to_user_id := NEW.assigned_to_user_id;
  END IF;
  -- Never change first_assigned_to_user_id once it's set
  IF OLD IS NOT NULL AND OLD.first_assigned_to_user_id IS NOT NULL THEN
    NEW.first_assigned_to_user_id := OLD.first_assigned_to_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_first_assigned_to_user ON public.leads;

CREATE TRIGGER trigger_set_first_assigned_to_user
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_first_assigned_to_user();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_leads_first_assigned_to_user_id ON public.leads(first_assigned_to_user_id);