-- Create inventory activity logs table (permanent audit trail - no delete allowed)
CREATE TABLE public.inventory_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL, -- CREATE, UPDATE, DELETE
  entity_type TEXT NOT NULL DEFAULT 'stock_movement',
  entity_id UUID,
  description TEXT NOT NULL,
  product_name TEXT,
  warehouse_name TEXT,
  movement_type TEXT,
  qty NUMERIC,
  amount NUMERIC,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performer_name TEXT,
  store_id UUID REFERENCES public.stores(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy - viewable by authenticated users for their store
CREATE POLICY "Users can view inventory logs for their store" 
  ON public.inventory_activity_logs 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    (store_id IS NULL OR user_has_store_access(auth.uid(), store_id) OR is_owner(auth.uid()))
  );

-- NO INSERT/UPDATE/DELETE policies for users - only triggers can write
-- Create insert policy for trigger/system use
CREATE POLICY "System can insert inventory logs"
  ON public.inventory_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_inventory_activity_logs_store_date ON public.inventory_activity_logs(store_id, performed_at DESC);
CREATE INDEX idx_inventory_activity_logs_entity ON public.inventory_activity_logs(entity_id);

-- Function to log inventory activity
CREATE OR REPLACE FUNCTION public.log_inventory_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_description TEXT;
  v_product_name TEXT;
  v_warehouse_name TEXT;
  v_performer_name TEXT;
  v_store_id UUID;
  v_amount NUMERIC;
  v_movement_record RECORD;
BEGIN
  -- Determine action type
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
  END;
  
  -- Get the relevant record
  IF TG_OP = 'DELETE' THEN
    v_movement_record := OLD;
  ELSE
    v_movement_record := NEW;
  END IF;
  
  -- Get product name
  SELECT name INTO v_product_name FROM products WHERE id = v_movement_record.product_id;
  
  -- Get warehouse name
  SELECT name INTO v_warehouse_name FROM warehouses WHERE id = v_movement_record.warehouse_id;
  
  -- Get performer name
  SELECT name INTO v_performer_name FROM profiles WHERE id = auth.uid();
  
  -- Get store_id from product
  SELECT store_id INTO v_store_id FROM products WHERE id = v_movement_record.product_id;
  
  -- Calculate amount (use total_value or qty * unit_price)
  v_amount := COALESCE(v_movement_record.total_value, v_movement_record.qty * COALESCE(v_movement_record.unit_price, 0));
  
  -- Build description
  IF TG_OP = 'INSERT' THEN
    v_description := v_movement_record.movement_type || ' - ' || COALESCE(v_product_name, 'Unknown') || 
                     ' (' || v_movement_record.qty || ' units) at ' || COALESCE(v_warehouse_name, 'Unknown');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if it's a soft delete
    IF NEW.is_deleted = true AND (OLD.is_deleted IS NULL OR OLD.is_deleted = false) THEN
      v_action := 'DELETE';
      v_description := 'Deleted: ' || v_movement_record.movement_type || ' - ' || COALESCE(v_product_name, 'Unknown') || 
                       ' (' || v_movement_record.qty || ' units)';
    ELSE
      v_description := 'Updated: ' || v_movement_record.movement_type || ' - ' || COALESCE(v_product_name, 'Unknown') || 
                       ' (' || v_movement_record.qty || ' units)';
    END IF;
  ELSE
    v_description := 'Hard Deleted: ' || v_movement_record.movement_type || ' - ' || COALESCE(v_product_name, 'Unknown') || 
                     ' (' || v_movement_record.qty || ' units)';
  END IF;
  
  -- Insert activity log
  INSERT INTO public.inventory_activity_logs (
    action_type, entity_type, entity_id, description,
    product_name, warehouse_name, movement_type, qty, amount,
    old_values, new_values, performed_by, performer_name, store_id, performed_at
  ) VALUES (
    v_action, 'stock_movement', v_movement_record.id, v_description,
    v_product_name, v_warehouse_name, v_movement_record.movement_type,
    v_movement_record.qty, v_amount,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(), v_performer_name, v_store_id, now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for stock movements
CREATE TRIGGER log_stock_movement_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.log_inventory_activity();