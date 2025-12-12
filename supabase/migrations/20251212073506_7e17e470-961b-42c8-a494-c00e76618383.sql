-- Function to auto-add employee to department chat room
CREATE OR REPLACE FUNCTION public.auto_add_employee_to_department_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_current_participants UUID[];
  v_department_name TEXT;
  v_old_department_name TEXT;
BEGIN
  -- Only proceed if user_id is set
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the department name for the new department_id
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO v_department_name FROM departments WHERE id = NEW.department_id;
  END IF;

  -- Find the department chat room matching the employee's department in their store
  IF v_department_name IS NOT NULL THEN
    SELECT id, participants INTO v_room_id, v_current_participants
    FROM chat_rooms
    WHERE store_id = NEW.store_id
      AND type = 'DEPARTMENT'
      AND LOWER(name) = LOWER(v_department_name)
    LIMIT 1;

    -- If room found, add user to participants if not already there
    IF v_room_id IS NOT NULL THEN
      IF v_current_participants IS NULL THEN
        v_current_participants := ARRAY[]::UUID[];
      END IF;
      
      -- Only add if not already a participant
      IF NOT (NEW.user_id = ANY(v_current_participants)) THEN
        UPDATE chat_rooms
        SET participants = array_append(COALESCE(participants, ARRAY[]::UUID[]), NEW.user_id)
        WHERE id = v_room_id;
      END IF;
    END IF;
  END IF;

  -- If department changed, remove from old department room
  IF TG_OP = 'UPDATE' AND OLD.department_id IS DISTINCT FROM NEW.department_id AND OLD.department_id IS NOT NULL THEN
    SELECT name INTO v_old_department_name FROM departments WHERE id = OLD.department_id;
    
    IF v_old_department_name IS NOT NULL THEN
      UPDATE chat_rooms
      SET participants = array_remove(participants, NEW.user_id)
      WHERE store_id = NEW.store_id
        AND type = 'DEPARTMENT'
        AND LOWER(name) = LOWER(v_old_department_name);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on employees table
DROP TRIGGER IF EXISTS trigger_auto_add_to_department_chat ON public.employees;
CREATE TRIGGER trigger_auto_add_to_department_chat
  AFTER INSERT OR UPDATE OF department_id, user_id ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_employee_to_department_chat();

-- Backfill: Add existing employees to their department chat rooms
DO $$
DECLARE
  emp RECORD;
  v_room_id UUID;
  v_current_participants UUID[];
  v_department_name TEXT;
BEGIN
  FOR emp IN 
    SELECT e.user_id, e.department_id, e.store_id 
    FROM employees e 
    WHERE e.user_id IS NOT NULL 
      AND e.department_id IS NOT NULL
      AND e.store_id IS NOT NULL
  LOOP
    SELECT name INTO v_department_name FROM departments WHERE id = emp.department_id;
    
    IF v_department_name IS NOT NULL THEN
      SELECT id, participants INTO v_room_id, v_current_participants
      FROM chat_rooms
      WHERE store_id = emp.store_id
        AND type = 'DEPARTMENT'
        AND LOWER(name) = LOWER(v_department_name)
      LIMIT 1;

      IF v_room_id IS NOT NULL THEN
        IF v_current_participants IS NULL OR NOT (emp.user_id = ANY(v_current_participants)) THEN
          UPDATE chat_rooms
          SET participants = array_append(COALESCE(participants, ARRAY[]::UUID[]), emp.user_id)
          WHERE id = v_room_id;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;