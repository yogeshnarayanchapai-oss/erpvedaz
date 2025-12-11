-- Step 1: Backfill store_id for existing customers from their linked orders
UPDATE customers c
SET store_id = (
  SELECT DISTINCT o.store_id 
  FROM orders o 
  WHERE o.customer_id = c.id 
  AND o.store_id IS NOT NULL 
  LIMIT 1
)
WHERE c.store_id IS NULL;

-- Step 2: Drop old unique constraint on phone_number only
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_number_key;

-- Step 3: Add new store-wise unique constraint
ALTER TABLE customers ADD CONSTRAINT customers_phone_store_unique 
  UNIQUE (phone_number, store_id);

-- Step 4: Update the sync_customer_from_order trigger function
CREATE OR REPLACE FUNCTION public.sync_customer_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_phone_number TEXT;
  v_full_address TEXT;
BEGIN
  -- Get customer info from lead if available
  IF NEW.lead_id IS NOT NULL THEN
    SELECT client_name, contact_number, full_address
    INTO v_customer_name, v_phone_number, v_full_address
    FROM leads
    WHERE id = NEW.lead_id;
  END IF;
  
  -- Skip if no phone number or no store_id
  IF v_phone_number IS NULL OR NEW.store_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Insert or update customer with store_id
  INSERT INTO public.customers (
    phone_number,
    customer_name,
    full_address,
    first_order_date,
    last_order_date,
    store_id
  )
  VALUES (
    v_phone_number,
    v_customer_name,
    COALESCE(NEW.full_address, v_full_address),
    NEW.order_date,
    NEW.order_date,
    NEW.store_id
  )
  ON CONFLICT (phone_number, store_id) DO UPDATE SET
    customer_name = COALESCE(EXCLUDED.customer_name, customers.customer_name),
    full_address = COALESCE(EXCLUDED.full_address, customers.full_address),
    last_order_date = GREATEST(customers.last_order_date, EXCLUDED.last_order_date),
    updated_at = NOW()
  RETURNING id INTO v_customer_id;
  
  -- Link order to customer
  NEW.customer_id := v_customer_id;
  
  -- Update customer stats
  UPDATE public.customers
  SET
    total_orders = (
      SELECT COUNT(*)
      FROM orders
      WHERE customer_id = v_customer_id
    ),
    total_order_value = (
      SELECT COALESCE(SUM(amount), 0)
      FROM orders
      WHERE customer_id = v_customer_id
        AND order_status IN ('CONFIRMED', 'DELIVERED')
    ),
    delivered_orders = (
      SELECT COUNT(*)
      FROM orders
      WHERE customer_id = v_customer_id
        AND order_status = 'DELIVERED'
    ),
    rto_orders = (
      SELECT COUNT(*)
      FROM orders
      WHERE customer_id = v_customer_id
        AND order_status IN ('RETURNED', 'CANCELLED')
    )
  WHERE id = v_customer_id;
  
  RETURN NEW;
END;
$function$;