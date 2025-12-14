-- Add is_deleted column for soft delete
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add deleted_at and deleted_by columns for audit trail
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_stock_movements_is_deleted ON public.stock_movements(is_deleted);

-- Update the recalculate_inventory function to exclude deleted movements
CREATE OR REPLACE FUNCTION public.recalculate_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id UUID;
  v_warehouse_id UUID;
  v_opening NUMERIC;
  v_in_total NUMERIC;
  v_out_total NUMERIC;
  v_new_stock NUMERIC;
  v_reorder_level NUMERIC;
BEGIN
  -- Determine which product/warehouse to update
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
    v_warehouse_id := OLD.warehouse_id;
  ELSE
    v_product_id := NEW.product_id;
    v_warehouse_id := NEW.warehouse_id;
  END IF;

  -- Get opening stock and reorder level
  SELECT COALESCE(opening_stock, 0), COALESCE(reorder_level, 0)
  INTO v_opening, v_reorder_level
  FROM public.product_inventory
  WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;

  -- If no inventory record exists, create one
  IF NOT FOUND THEN
    v_opening := 0;
    v_reorder_level := 0;
    INSERT INTO public.product_inventory (product_id, warehouse_id, opening_stock, current_stock, reorder_level)
    VALUES (v_product_id, v_warehouse_id, 0, 0, 0);
  END IF;

  -- Calculate total IN movements (exclude deleted)
  SELECT COALESCE(SUM(qty), 0) INTO v_in_total
  FROM public.stock_movements
  WHERE product_id = v_product_id 
    AND warehouse_id = v_warehouse_id
    AND movement_type IN ('IN', 'TRANSFER_IN', 'RTO_IN')
    AND (is_deleted = false OR is_deleted IS NULL);

  -- Calculate total OUT movements (exclude deleted)
  SELECT COALESCE(SUM(qty), 0) INTO v_out_total
  FROM public.stock_movements
  WHERE product_id = v_product_id 
    AND warehouse_id = v_warehouse_id
    AND movement_type IN ('OUT', 'TRANSFER_OUT', 'ADJUSTMENT', 'RTO_OUT')
    AND (is_deleted = false OR is_deleted IS NULL);

  -- Calculate new stock
  v_new_stock := v_opening + v_in_total - v_out_total;

  -- Update inventory
  UPDATE public.product_inventory
  SET current_stock = v_new_stock,
      reorder_required = (v_new_stock <= v_reorder_level),
      updated_at = now()
  WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;