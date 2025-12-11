-- Fix the get_customer_insight function - use correct column name
CREATE OR REPLACE FUNCTION public.get_customer_insight(p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  clean_phone text;
BEGIN
  -- Clean the phone number
  clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  -- Get customer info with last order status
  SELECT json_build_object(
    'exists', true,
    'id', c.id,
    'name', c.customer_name,
    'total_orders', c.total_orders,
    'total_amount', c.total_order_value,
    'rto_count', c.rto_orders,
    'delivered_count', c.delivered_orders,
    'last_order_at', c.last_order_date,
    'store_id', c.store_id,
    'store_name', s.name,
    'handled_by_name', p.full_name,
    'last_product_name', pr.name,
    'last_product_price', COALESCE(lo.total_amount, pr.selling_price),
    'last_order_status', lo.order_status
  ) INTO result
  FROM customers c
  LEFT JOIN stores s ON s.id = c.store_id
  LEFT JOIN LATERAL (
    SELECT o.created_by_staff_id, o.amount as total_amount, o.order_status
    FROM orders o 
    WHERE o.customer_id = c.id
    ORDER BY o.created_at DESC 
    LIMIT 1
  ) lo ON true
  LEFT JOIN profiles p ON p.id = lo.created_by_staff_id
  LEFT JOIN LATERAL (
    SELECT oi.product_id
    FROM order_items oi
    JOIN orders o2 ON o2.id = oi.order_id
    WHERE o2.customer_id = c.id
    ORDER BY o2.created_at DESC
    LIMIT 1
  ) loi ON true
  LEFT JOIN products pr ON pr.id = loi.product_id
  WHERE regexp_replace(c.phone_number, '[^0-9]', '', 'g') = clean_phone
  LIMIT 1;
  
  IF result IS NULL THEN
    result := json_build_object('exists', false);
  END IF;
  
  RETURN result;
END;
$$;