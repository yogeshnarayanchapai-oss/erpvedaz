
-- Add completed_date column to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_date TIMESTAMPTZ;

-- Create trigger to auto-set completed_date when status becomes COMPLETED
CREATE OR REPLACE FUNCTION public.set_task_completed_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When status changes to COMPLETED, set completed_date
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    NEW.completed_date = NOW();
  END IF;
  -- When status changes away from COMPLETED, clear completed_date
  IF NEW.status != 'COMPLETED' AND OLD.status = 'COMPLETED' THEN
    NEW.completed_date = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_task_completed_date ON public.tasks;
CREATE TRIGGER trigger_set_task_completed_date
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_completed_date();

-- Backfill: set completed_date for already completed tasks using their updated_at
UPDATE public.tasks 
SET completed_date = updated_at 
WHERE status = 'COMPLETED' AND completed_date IS NULL;
