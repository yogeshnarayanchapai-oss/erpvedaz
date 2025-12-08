-- Create function to notify owners on delete
CREATE OR REPLACE FUNCTION notify_owner_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  owner_record RECORD;
  deleted_details TEXT;
  table_display_name TEXT;
  actor_name TEXT;
  store_id_value UUID;
BEGIN
  -- Get the actor name (who deleted)
  SELECT full_name INTO actor_name FROM profiles WHERE id = auth.uid();
  IF actor_name IS NULL THEN
    actor_name := 'Unknown User';
  END IF;
  
  -- Set table display name
  CASE TG_TABLE_NAME
    WHEN 'orders' THEN 
      table_display_name := 'Order';
      deleted_details := 'Order #' || COALESCE(OLD.id::text, 'N/A') || ' - Customer: ' || COALESCE(OLD.customer_name, 'N/A') || ', Phone: ' || COALESCE(OLD.customer_phone, 'N/A');
      store_id_value := OLD.store_id;
    WHEN 'leads' THEN 
      table_display_name := 'Lead';
      deleted_details := 'Lead - Client: ' || COALESCE(OLD.client_name, 'N/A') || ', Phone: ' || COALESCE(OLD.contact_number, 'N/A');
      store_id_value := OLD.store_id;
    WHEN 'products' THEN 
      table_display_name := 'Product';
      deleted_details := 'Product: ' || COALESCE(OLD.name, 'N/A') || ', SKU: ' || COALESCE(OLD.sku, 'N/A');
      store_id_value := OLD.store_id;
    WHEN 'customers' THEN 
      table_display_name := 'Customer';
      deleted_details := 'Customer: ' || COALESCE(OLD.customer_name, 'N/A') || ', Phone: ' || COALESCE(OLD.phone_number, 'N/A');
      store_id_value := OLD.store_id;
    WHEN 'employees' THEN 
      table_display_name := 'Employee';
      deleted_details := 'Employee: ' || COALESCE(OLD.full_name, 'N/A') || ', Phone: ' || COALESCE(OLD.phone, 'N/A');
      store_id_value := NULL;
    ELSE 
      table_display_name := TG_TABLE_NAME;
      deleted_details := 'Record ID: ' || OLD.id::text;
      store_id_value := NULL;
  END CASE;

  -- Insert notification for all OWNER users
  FOR owner_record IN 
    SELECT p.id FROM profiles p WHERE p.role = 'OWNER'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, store_id)
    VALUES (
      owner_record.id,
      table_display_name || ' Deleted',
      deleted_details || ' | Deleted by: ' || actor_name,
      'DELETION',
      store_id_value
    );
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for important tables
DROP TRIGGER IF EXISTS notify_owner_order_delete ON orders;
CREATE TRIGGER notify_owner_order_delete
  BEFORE DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_delete();

DROP TRIGGER IF EXISTS notify_owner_lead_delete ON leads;
CREATE TRIGGER notify_owner_lead_delete
  BEFORE DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_delete();

DROP TRIGGER IF EXISTS notify_owner_product_delete ON products;
CREATE TRIGGER notify_owner_product_delete
  BEFORE DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_delete();

DROP TRIGGER IF EXISTS notify_owner_customer_delete ON customers;
CREATE TRIGGER notify_owner_customer_delete
  BEFORE DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_delete();

DROP TRIGGER IF EXISTS notify_owner_employee_delete ON employees;
CREATE TRIGGER notify_owner_employee_delete
  BEFORE DELETE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_delete();