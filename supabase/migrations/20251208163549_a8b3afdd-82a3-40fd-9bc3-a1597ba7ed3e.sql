CREATE OR REPLACE FUNCTION public.notify_owner_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  owner_record RECORD;
  deleted_details TEXT;
  table_display_name TEXT;
  actor_name TEXT;
  store_id_value UUID;
BEGIN
  -- Get the actor name (who deleted) - profiles table has 'name' column, not 'full_name'
  SELECT name INTO actor_name FROM profiles WHERE id = auth.uid();
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
$function$;