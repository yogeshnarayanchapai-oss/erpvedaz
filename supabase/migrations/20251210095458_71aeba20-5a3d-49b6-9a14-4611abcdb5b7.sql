-- Add column to track historical lead assignment count that never decreases
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_leads_ever_assigned INTEGER DEFAULT 0;

-- Backfill existing data from first_assigned_to_user_id
UPDATE public.profiles p
SET total_leads_ever_assigned = COALESCE((
  SELECT COUNT(*) 
  FROM public.leads l 
  WHERE l.first_assigned_to_user_id = p.id
), 0);

-- Create function to increment the counter when a lead is first assigned
CREATE OR REPLACE FUNCTION increment_lead_assignment_counter()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment when first_assigned_to_user_id is set (new assignment)
  IF NEW.first_assigned_to_user_id IS NOT NULL AND 
     (OLD.first_assigned_to_user_id IS NULL OR OLD.first_assigned_to_user_id IS DISTINCT FROM NEW.first_assigned_to_user_id) THEN
    UPDATE public.profiles 
    SET total_leads_ever_assigned = COALESCE(total_leads_ever_assigned, 0) + 1
    WHERE id = NEW.first_assigned_to_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS trigger_increment_lead_assignment ON public.leads;
CREATE TRIGGER trigger_increment_lead_assignment
AFTER INSERT OR UPDATE OF first_assigned_to_user_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION increment_lead_assignment_counter();