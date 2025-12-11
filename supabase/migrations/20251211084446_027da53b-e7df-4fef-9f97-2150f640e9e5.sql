-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS public.get_customer_insight(TEXT);

CREATE OR REPLACE FUNCTION public.get_customer_insight(p_phone TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_last_order RECORD;
  v_result JSON;
  v_product_name TEXT;
  v_staff_name TEXT;
  v_store_name TEXT;
BEGIN
  -- Find customer by phone number
  SELECT * INTO v_customer
  FROM customers
  WHERE phone_number = p_phone
  LIMIT 1;

  IF v_customer IS NULL THEN
    RETURN json_build_object('exists', false);
  END IF;

  -- Get last order with product and sales person info
  SELECT o.id, o.product_id, o.sales_person_id, o.store_id, o.created_at
  INTO v_last_order
  FROM orders o
  WHERE o.customer_id = v_customer.id
  ORDER BY o.created_at DESC
  LIMIT 1;

  -- Get product name
  IF v_last_order.product_id IS NOT NULL THEN
    SELECT p.name INTO v_product_name
    FROM products p
    WHERE p.id = v_last_order.product_id;
  END IF;

  -- Fallback: try to get product from order_items
  IF v_product_name IS NULL AND v_last_order.id IS NOT NULL THEN
    SELECT p.name INTO v_product_name
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = v_last_order.id
    LIMIT 1;
  END IF;

  -- Get staff name (from profiles.name column)
  IF v_last_order.sales_person_id IS NOT NULL THEN
    SELECT pr.name INTO v_staff_name
    FROM profiles pr
    WHERE pr.id = v_last_order.sales_person_id;
  END IF;

  -- Get store name
  IF v_last_order.store_id IS NOT NULL THEN
    SELECT s.name INTO v_store_name
    FROM stores s
    WHERE s.id = v_last_order.store_id;
  END IF;

  RETURN json_build_object(
    'exists', true,
    'id', v_customer.id,
    'name', v_customer.customer_name,
    'total_orders', COALESCE(v_customer.total_orders, 0),
    'total_amount', COALESCE(v_customer.total_order_value, 0),
    'rto_count', COALESCE(v_customer.rto_orders, 0),
    'delivered_count', COALESCE(v_customer.delivered_orders, 0),
    'last_order_at', v_customer.last_order_date,
    'store_id', v_last_order.store_id,
    'store_name', v_store_name,
    'handled_by_name', v_staff_name,
    'last_product_name', v_product_name
  );
END;
$$;