-- Update trigger to increment counter for EACH staff assignment (not just first)
CREATE OR REPLACE FUNCTION increment_lead_assignment_counter()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: increment for the assigned user
  IF TG_OP = 'INSERT' AND NEW.assigned_to_user_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET total_leads_ever_assigned = COALESCE(total_leads_ever_assigned, 0) + 1
    WHERE id = NEW.assigned_to_user_id;
  END IF;
  
  -- On UPDATE: if assigned_to_user_id changed to a new person, increment their count
  IF TG_OP = 'UPDATE' AND NEW.assigned_to_user_id IS NOT NULL 
     AND (OLD.assigned_to_user_id IS NULL OR OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id) THEN
    UPDATE public.profiles 
    SET total_leads_ever_assigned = COALESCE(total_leads_ever_assigned, 0) + 1
    WHERE id = NEW.assigned_to_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for DELETE to decrement counter
CREATE OR REPLACE FUNCTION decrement_lead_assignment_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- When lead is deleted, decrement the current assigned user's count
  IF OLD.assigned_to_user_id IS NOT NULL THEN
    UPDATE public.profiles 
    SET total_leads_ever_assigned = GREATEST(0, COALESCE(total_leads_ever_assigned, 0) - 1)
    WHERE id = OLD.assigned_to_user_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS trigger_increment_lead_assignment ON public.leads;
DROP TRIGGER IF EXISTS trigger_decrement_lead_on_delete ON public.leads;

CREATE TRIGGER trigger_increment_lead_assignment
AFTER INSERT OR UPDATE OF assigned_to_user_id ON public.leads
FOR EACH ROW
EXECUTE FUNCTION increment_lead_assignment_counter();

CREATE TRIGGER trigger_decrement_lead_on_delete
AFTER DELETE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION decrement_lead_assignment_on_delete();

-- Recalculate all counts based on lead_transfers history + current assignments
-- First reset all counts
UPDATE public.profiles SET total_leads_ever_assigned = 0;

-- Count from lead_transfers (each transfer = 1 assignment to that user)
UPDATE public.profiles p
SET total_leads_ever_assigned = total_leads_ever_assigned + COALESCE((
  SELECT COUNT(*) 
  FROM public.lead_transfers lt 
  WHERE lt.to_user_id = p.id
), 0);

-- Also count current assignments (leads currently assigned)
UPDATE public.profiles p
SET total_leads_ever_assigned = total_leads_ever_assigned + COALESCE((
  SELECT COUNT(*) 
  FROM public.leads l 
  WHERE l.assigned_to_user_id = p.id
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_transfers lt 
      WHERE lt.lead_id = l.id AND lt.to_user_id = p.id
    )
), 0);