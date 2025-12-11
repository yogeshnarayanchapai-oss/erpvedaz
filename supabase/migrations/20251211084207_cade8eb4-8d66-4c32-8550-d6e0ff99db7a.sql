-- Create a security definer function to get customer insight data
-- This allows viewing customer history across stores without bypassing security
CREATE OR REPLACE FUNCTION public.get_customer_insight(p_phone TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_last_order RECORD;
  v_product_name TEXT;
  v_handled_by_name TEXT;
  v_result JSON;
BEGIN
  -- Clean phone number
  p_phone := regexp_replace(p_phone, '\D', '', 'g');
  
  -- Get customer info
  SELECT 
    c.id,
    c.customer_name,
    c.total_orders,
    c.total_order_value,
    c.rto_orders,
    c.delivered_orders,
    c.last_order_date,
    c.store_id,
    s.name as store_name
  INTO v_customer
  FROM customers c
  LEFT JOIN stores s ON s.id = c.store_id
  WHERE c.phone_number = p_phone
  ORDER BY c.total_orders DESC NULLS LAST
  LIMIT 1;
  
  IF v_customer IS NULL THEN
    RETURN json_build_object('exists', false);
  END IF;
  
  -- Get last order info
  SELECT 
    o.id,
    o.product_id,
    o.sales_person_id
  INTO v_last_order
  FROM orders o
  WHERE o.customer_id = v_customer.id
  ORDER BY o.created_at DESC
  LIMIT 1;
  
  -- Get product name
  IF v_last_order.product_id IS NOT NULL THEN
    SELECT name INTO v_product_name FROM products WHERE id = v_last_order.product_id;
  END IF;
  
  -- If no product from order, check order_items
  IF v_product_name IS NULL AND v_last_order.id IS NOT NULL THEN
    SELECT p.name INTO v_product_name
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = v_last_order.id
    LIMIT 1;
  END IF;
  
  -- Get handled by name
  IF v_last_order.sales_person_id IS NOT NULL THEN
    SELECT full_name INTO v_handled_by_name FROM profiles WHERE id = v_last_order.sales_person_id;
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
    'store_id', v_customer.store_id,
    'store_name', v_customer.store_name,
    'handled_by_name', v_handled_by_name,
    'last_product_name', v_product_name
  );
END;
$$;