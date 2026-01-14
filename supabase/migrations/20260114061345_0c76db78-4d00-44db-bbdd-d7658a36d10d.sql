-- Fix trigger function - stock_movements has no store_id, get it from product or party
CREATE OR REPLACE FUNCTION public.create_party_transaction_from_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_party_id uuid;
  v_store_id uuid;
  v_amount numeric;
  v_direction text;
  v_source text;
  v_product_name text;
  v_qty numeric;
  v_rate numeric;
  v_existing_tx_id uuid;
BEGIN
  -- For UPDATE, check if related_to_accounting changed
  IF TG_OP = 'UPDATE' THEN
    -- If related_to_accounting changed from true to false, delete the party transaction
    IF OLD.related_to_accounting = true AND NEW.related_to_accounting = false THEN
      DELETE FROM public.party_transactions 
      WHERE reference = NEW.id::text 
        AND source IN ('Stock IN', 'Wholesale Out');
      RETURN NEW;
    END IF;
    
    -- If related_to_accounting changed from false to true, create the party transaction
    IF (OLD.related_to_accounting = false OR OLD.related_to_accounting IS NULL) AND NEW.related_to_accounting = true THEN
      -- Continue to create the transaction below
      NULL;
    ELSE
      -- No relevant change, return
      RETURN NEW;
    END IF;
  END IF;
  
  -- For INSERT, check if related_to_accounting is false
  IF TG_OP = 'INSERT' AND NEW.related_to_accounting = false THEN
    RETURN NEW;
  END IF;

  -- Only process IN and WHOLESALE_OUT movements with a party_id
  IF NEW.movement_type NOT IN ('IN', 'WHOLESALE_OUT') OR NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if party transaction already exists for this stock movement
  SELECT id INTO v_existing_tx_id 
  FROM public.party_transactions 
  WHERE reference = NEW.id::text 
    AND source IN ('Stock IN', 'Wholesale Out')
  LIMIT 1;
  
  IF v_existing_tx_id IS NOT NULL THEN
    -- Already exists, skip
    RETURN NEW;
  END IF;

  -- Get store_id from party (since stock_movements doesn't have store_id)
  SELECT store_id INTO v_store_id FROM public.parties WHERE id = NEW.party_id;

  -- Get party_id and calculate values
  v_party_id := NEW.party_id;
  v_qty := COALESCE(NEW.qty, 0);
  v_rate := COALESCE(NEW.unit_price, NEW.unit_cost, 0);
  v_amount := v_qty * v_rate;
  
  -- Get product name for source
  SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
  
  IF NEW.movement_type = 'IN' THEN
    -- Stock IN = We received goods, so we owe the party (PAYABLE)
    v_direction := 'PAYABLE';
    v_source := 'Stock IN';
  ELSIF NEW.movement_type = 'WHOLESALE_OUT' THEN
    -- Wholesale OUT = We sold goods, party owes us (RECEIVABLE)
    v_direction := 'RECEIVABLE';
    v_source := 'Wholesale Out';
  ELSE
    RETURN NEW;
  END IF;

  -- Only create transaction if amount > 0
  IF v_amount > 0 THEN
    INSERT INTO public.party_transactions (
      party_id,
      store_id,
      date,
      product_id,
      warehouse_id,
      qty,
      rate,
      amount,
      direction,
      source,
      reference,
      remarks,
      is_settled
    ) VALUES (
      v_party_id,
      v_store_id,
      COALESCE(NEW.movement_date, CURRENT_DATE),
      NEW.product_id,
      COALESCE(NEW.to_warehouse_id, NEW.from_warehouse_id, NEW.warehouse_id),
      v_qty,
      v_rate,
      v_amount,
      v_direction,
      v_source,
      NEW.id::text,
      NEW.remark,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;