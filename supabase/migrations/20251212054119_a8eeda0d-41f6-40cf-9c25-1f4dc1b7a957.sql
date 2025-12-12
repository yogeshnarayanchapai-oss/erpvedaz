-- Fix the function search_path security warning
CREATE OR REPLACE FUNCTION generate_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := lower(replace(NEW.name, ' ', '_')) || '_' || substr(NEW.id::text, 1, 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;