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
  actor_user_id UUID;
  store_id_value UUID;
  v_lead_info RECORD;
BEGIN
  -- Get the actor info (who deleted)
  actor_user_id := auth.uid();
  SELECT name INTO actor_name FROM profiles WHERE id = actor_user_id;
  IF actor_name IS NULL THEN
    actor_name := 'Unknown User';
  END IF;
  
  -- Set table display name
  CASE TG_TABLE_NAME
    WHEN 'orders' THEN 
      table_display_name := 'Order';
      -- Get customer info from linked lead
      IF OLD.lead_id IS NOT NULL THEN
        SELECT client_name, contact_number INTO v_lead_info FROM leads WHERE id = OLD.lead_id;
        deleted_details := 'Order #' || COALESCE(OLD.order_number::text, OLD.id::text) || ' - Customer: ' || COALESCE(v_lead_info.client_name, 'N/A') || ', Phone: ' || COALESCE(v_lead_info.contact_number, 'N/A');
      ELSE
        deleted_details := 'Order #' || COALESCE(OLD.order_number::text, OLD.id::text) || ' - Address: ' || COALESCE(OLD.full_address, 'N/A');
      END IF;
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
    INSERT INTO notifications (target_user_id, title, message, type, store_id, actor_id, actor_name, target_role)
    VALUES (
      owner_record.id,
      table_display_name || ' Deleted',
      deleted_details || ' | Deleted by: ' || actor_name,
      'DELETION',
      store_id_value,
      actor_user_id,
      actor_name,
      'OWNER'
    );
  END LOOP;

  RETURN OLD;
END;
$function$;