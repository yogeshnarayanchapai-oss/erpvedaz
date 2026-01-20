-- Function to create attendance records for holidays (for all active employees)
CREATE OR REPLACE FUNCTION create_holiday_attendance_records()
RETURNS TRIGGER AS $$
DECLARE
  emp RECORD;
BEGIN
  -- For the new holiday date, create attendance records for all active employees
  FOR emp IN 
    SELECT id, store_id 
    FROM employees 
    WHERE status = 'Active'
    AND (
      NEW.store_id IS NULL  -- Global holiday applies to all
      OR store_id = NEW.store_id  -- Store-specific holiday
      OR store_id IS NULL  -- Employees without store get global holidays
    )
  LOOP
    -- Insert only if no record exists for that date
    INSERT INTO attendance_records (employee_id, date, status, store_id, notes)
    VALUES (emp.id, NEW.date, 'Holiday', emp.store_id, 'Office holiday: ' || NEW.title)
    ON CONFLICT (employee_id, date) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for holiday creation
DROP TRIGGER IF EXISTS trigger_create_holiday_attendance ON office_holidays;
CREATE TRIGGER trigger_create_holiday_attendance
  AFTER INSERT ON office_holidays
  FOR EACH ROW
  EXECUTE FUNCTION create_holiday_attendance_records();

-- Function to create attendance records when leave is approved
CREATE OR REPLACE FUNCTION create_leave_attendance_records()
RETURNS TRIGGER AS $$
DECLARE
  leave_date DATE;
  emp_store_id UUID;
BEGIN
  -- Only process when status changes to 'Approved'
  IF NEW.status = 'Approved' AND (OLD.status IS NULL OR OLD.status <> 'Approved') THEN
    -- Get employee's store_id
    SELECT store_id INTO emp_store_id FROM employees WHERE id = NEW.employee_id;
    
    -- Create attendance record for each day in the leave range
    FOR leave_date IN 
      SELECT generate_series(NEW.from_date::date, NEW.to_date::date, '1 day'::interval)::date
    LOOP
      -- Insert only if no record exists for that date
      INSERT INTO attendance_records (employee_id, date, status, store_id, notes)
      VALUES (NEW.employee_id, leave_date, 'Leave', emp_store_id, 'Approved leave')
      ON CONFLICT (employee_id, date) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for leave approval
DROP TRIGGER IF EXISTS trigger_create_leave_attendance ON leave_requests;
CREATE TRIGGER trigger_create_leave_attendance
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_leave_attendance_records();

-- Function to create Saturday records for future Saturdays (called via edge function)
CREATE OR REPLACE FUNCTION create_saturday_attendance_records(target_date DATE)
RETURNS INTEGER AS $$
DECLARE
  emp RECORD;
  inserted_count INTEGER := 0;
BEGIN
  -- Only process if target_date is actually a Saturday
  IF EXTRACT(DOW FROM target_date) <> 6 THEN
    RETURN 0;
  END IF;
  
  FOR emp IN 
    SELECT id, store_id 
    FROM employees 
    WHERE status = 'Active'
  LOOP
    -- Insert only if no record exists for that date
    INSERT INTO attendance_records (employee_id, date, status, store_id, notes)
    VALUES (emp.id, target_date, 'Saturday', emp.store_id, 'Weekly off (Saturday)')
    ON CONFLICT (employee_id, date) DO NOTHING;
    
    IF FOUND THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;