-- Update recalculate_inventory function to handle new TRANSFER type with from/to warehouses
-- Also handle WHOLESALE_OUT as an OUT movement
CREATE OR REPLACE FUNCTION public.recalculate_inventory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id UUID;
  v_warehouse_id UUID;
  v_to_warehouse_id UUID;
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
    v_to_warehouse_id := OLD.to_warehouse_id;
  ELSE
    v_product_id := NEW.product_id;
    v_warehouse_id := NEW.warehouse_id;
    v_to_warehouse_id := NEW.to_warehouse_id;
  END IF;

  -- Recalculate for primary warehouse
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

  -- Calculate total IN movements for primary warehouse (exclude deleted)
  -- IN types: IN, RTO_IN, and TRANSFER where this warehouse is the destination (to_warehouse_id)
  SELECT COALESCE(SUM(qty), 0) INTO v_in_total
  FROM public.stock_movements
  WHERE product_id = v_product_id 
    AND (
      -- Standard IN movements to this warehouse
      (warehouse_id = v_warehouse_id AND movement_type IN ('IN', 'TRANSFER_IN', 'RTO_IN'))
      -- TRANSFER movements where this warehouse is the destination
      OR (to_warehouse_id = v_warehouse_id AND movement_type = 'TRANSFER')
    )
    AND (is_deleted = false OR is_deleted IS NULL);

  -- Calculate total OUT movements for primary warehouse (exclude deleted)
  -- OUT types: OUT, WHOLESALE_OUT, ADJUSTMENT, RTO_OUT, TRANSFER_OUT, and TRANSFER where this is source
  SELECT COALESCE(SUM(qty), 0) INTO v_out_total
  FROM public.stock_movements
  WHERE product_id = v_product_id 
    AND (
      -- Standard OUT movements from this warehouse
      (warehouse_id = v_warehouse_id AND movement_type IN ('OUT', 'WHOLESALE_OUT', 'TRANSFER_OUT', 'ADJUSTMENT', 'RTO_OUT'))
      -- TRANSFER movements where this warehouse is the source (from_warehouse_id = warehouse_id)
      OR (warehouse_id = v_warehouse_id AND movement_type = 'TRANSFER' AND from_warehouse_id = v_warehouse_id)
    )
    AND (is_deleted = false OR is_deleted IS NULL);

  -- Calculate new stock for primary warehouse
  v_new_stock := v_opening + v_in_total - v_out_total;

  -- Update inventory for primary warehouse
  UPDATE public.product_inventory
  SET current_stock = v_new_stock,
      reorder_required = (v_new_stock <= v_reorder_level),
      updated_at = now()
  WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;

  -- For TRANSFER movements, also recalculate the destination warehouse
  IF v_to_warehouse_id IS NOT NULL AND v_to_warehouse_id != v_warehouse_id THEN
    -- Get opening stock for destination warehouse
    SELECT COALESCE(opening_stock, 0), COALESCE(reorder_level, 0)
    INTO v_opening, v_reorder_level
    FROM public.product_inventory
    WHERE product_id = v_product_id AND warehouse_id = v_to_warehouse_id;

    IF NOT FOUND THEN
      v_opening := 0;
      v_reorder_level := 0;
      INSERT INTO public.product_inventory (product_id, warehouse_id, opening_stock, current_stock, reorder_level)
      VALUES (v_product_id, v_to_warehouse_id, 0, 0, 0);
    END IF;

    -- Calculate IN for destination warehouse
    SELECT COALESCE(SUM(qty), 0) INTO v_in_total
    FROM public.stock_movements
    WHERE product_id = v_product_id 
      AND (
        (warehouse_id = v_to_warehouse_id AND movement_type IN ('IN', 'TRANSFER_IN', 'RTO_IN'))
        OR (to_warehouse_id = v_to_warehouse_id AND movement_type = 'TRANSFER')
      )
      AND (is_deleted = false OR is_deleted IS NULL);

    -- Calculate OUT for destination warehouse
    SELECT COALESCE(SUM(qty), 0) INTO v_out_total
    FROM public.stock_movements
    WHERE product_id = v_product_id 
      AND (
        (warehouse_id = v_to_warehouse_id AND movement_type IN ('OUT', 'WHOLESALE_OUT', 'TRANSFER_OUT', 'ADJUSTMENT', 'RTO_OUT'))
        OR (warehouse_id = v_to_warehouse_id AND movement_type = 'TRANSFER' AND from_warehouse_id = v_to_warehouse_id)
      )
      AND (is_deleted = false OR is_deleted IS NULL);

    v_new_stock := v_opening + v_in_total - v_out_total;

    UPDATE public.product_inventory
    SET current_stock = v_new_stock,
        reorder_required = (v_new_stock <= v_reorder_level),
        updated_at = now()
    WHERE product_id = v_product_id AND warehouse_id = v_to_warehouse_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;