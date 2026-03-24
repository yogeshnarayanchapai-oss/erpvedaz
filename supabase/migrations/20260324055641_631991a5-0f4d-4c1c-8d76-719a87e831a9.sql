
-- Trigger: Auto-inactivate employees when their store becomes inactive
CREATE OR REPLACE FUNCTION public.auto_inactivate_employees_on_store_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When store is deactivated, set all its employees to Inactive
  IF NEW.is_active = false AND OLD.is_active = true THEN
    UPDATE employees SET status = 'Inactive' WHERE store_id = NEW.id AND status = 'Active';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_inactivate_employees_on_store
  AFTER UPDATE OF is_active ON public.stores
  FOR EACH ROW
  WHEN (OLD.is_active = true AND NEW.is_active = false)
  EXECUTE FUNCTION public.auto_inactivate_employees_on_store_deactivation();
