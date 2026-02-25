-- Fix: Use NULLIF to treat 0 as NULL in price fallback logic for both transaction triggers

-- 1. Fix create_transaction_from_stock_movement
CREATE OR REPLACE FUNCTION public.create_transaction_from_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_store_id uuid;
  v_amount numeric;
  v_transaction_type text;
  v_type text;
  v_qty numeric;
  v_rate numeric;
  v_existing_tx_id uuid;
  v_product_name text;
BEGIN
  -- Handle toggle updates (related_to_accounting toggled off)
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.related_to_accounting, true) = true AND NEW.related_to_accounting = false THEN
      -- Delete linked transaction
      DELETE FROM public.transactions
      WHERE reference_type = 'stock_movement'
        AND reference_id = NEW.id::text;
      RETURN NEW;
    END IF;

    IF COALESCE(OLD.related_to_accounting, true) = false AND NEW.related_to_accounting = true THEN
      NULL; -- continue to create below
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- For INSERT, skip when explicitly disabled
  IF TG_OP = 'INSERT' AND NEW.related_to_accounting = false THEN
    RETURN NEW;
  END IF;

  -- Only process IN and WHOLESALE_OUT with party
  IF NEW.movement_type NOT IN ('IN', 'WHOLESALE_OUT') OR NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates
  SELECT id INTO v_existing_tx_id
  FROM public.transactions
  WHERE reference_type = 'stock_movement'
    AND reference_id = NEW.id::text
  LIMIT 1;

  IF v_existing_tx_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- store_id comes from party
  SELECT store_id INTO v_store_id FROM public.parties WHERE id = NEW.party_id;

  -- Get product name
  SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;

  v_qty := COALESCE(NEW.qty, 0);

  IF NEW.movement_type = 'IN' THEN
    v_transaction_type := 'SALES_IN';
    v_type := 'expense';
    -- Use NULLIF to treat 0 as NULL so it falls through to the next value
    v_rate := COALESCE(NULLIF(NEW.unit_cost, 0), NULLIF(NEW.unit_price, 0), 0);
  ELSE
    v_transaction_type := 'SALES_OUT';
    v_type := 'income';
    v_rate := COALESCE(NULLIF(NEW.unit_price, 0), NULLIF(NEW.unit_cost, 0), 0);
  END IF;

  v_amount := v_qty * v_rate;

  IF v_amount > 0 THEN
    INSERT INTO public.transactions (
      date,
      type,
      transaction_type,
      amount,
      currency,
      account_id,
      party_id,
      description,
      note,
      is_cleared,
      store_id,
      reference_type,
      reference_id
    ) VALUES (
      COALESCE(NEW.movement_date, CURRENT_DATE),
      v_type,
      v_transaction_type,
      v_amount,
      'NPR',
      NULL,
      NEW.party_id,
      v_transaction_type || ' - ' || COALESCE(v_product_name, 'Product'),
      NEW.remark,
      false,
      v_store_id,
      'stock_movement',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Fix create_party_transaction_from_stock_movement
CREATE OR REPLACE FUNCTION public.create_party_transaction_from_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_store_id uuid;
  v_amount numeric;
  v_direction text;
  v_source text;
  v_qty numeric;
  v_rate numeric;
  v_existing_tx_id uuid;
BEGIN
  -- Handle toggle updates
  IF TG_OP = 'UPDATE' THEN
    -- Treat NULL as TRUE (default)
    IF COALESCE(OLD.related_to_accounting, true) = true AND NEW.related_to_accounting = false THEN
      DELETE FROM public.party_transactions
      WHERE reference = NEW.id::text
        AND source IN ('STOCK_IN', 'WHOLESALE_OUT');
      RETURN NEW;
    END IF;

    IF COALESCE(OLD.related_to_accounting, true) = false AND NEW.related_to_accounting = true THEN
      -- continue to create below
      NULL;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- For INSERT, skip when explicitly disabled
  IF TG_OP = 'INSERT' AND NEW.related_to_accounting = false THEN
    RETURN NEW;
  END IF;

  -- Only process IN and WHOLESALE_OUT with party
  IF NEW.movement_type NOT IN ('IN', 'WHOLESALE_OUT') OR NEW.party_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates
  SELECT id INTO v_existing_tx_id
  FROM public.party_transactions
  WHERE reference = NEW.id::text
    AND source IN ('STOCK_IN', 'WHOLESALE_OUT')
  LIMIT 1;

  IF v_existing_tx_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- store_id comes from party
  SELECT store_id INTO v_store_id FROM public.parties WHERE id = NEW.party_id;

  v_qty := COALESCE(NEW.qty, 0);

  IF NEW.movement_type = 'IN' THEN
    -- Stock IN = Payable (we owe party)
    v_direction := 'PAYABLE';
    v_source := 'STOCK_IN';
    v_rate := COALESCE(NULLIF(NEW.unit_cost, 0), NULLIF(NEW.unit_price, 0), 0);
  ELSE
    -- Wholesale Out = Receivable (party owes us)
    v_direction := 'RECEIVABLE';
    v_source := 'WHOLESALE_OUT';
    v_rate := COALESCE(NULLIF(NEW.unit_price, 0), NULLIF(NEW.unit_cost, 0), 0);
  END IF;

  v_amount := v_qty * v_rate;

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
      NEW.party_id,
      v_store_id,
      COALESCE(NEW.movement_date, CURRENT_DATE),
      NEW.product_id,
      COALESCE(NEW.warehouse_id, NEW.from_warehouse_id, NEW.to_warehouse_id),
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
$function$;

-- 3. Fix sync_transaction_on_stock_update 
CREATE OR REPLACE FUNCTION public.sync_transaction_on_stock_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id UUID;
  v_rate NUMERIC;
  v_new_amount NUMERIC;
BEGIN
  -- Only sync if party_id is set and movement type creates transactions
  IF NEW.party_id IS NOT NULL AND 
     NEW.movement_type IN ('IN', 'WHOLESALE_OUT') THEN
    
    -- Determine rate based on movement type, using NULLIF for 0 fallback
    IF NEW.movement_type = 'IN' THEN
      v_rate := COALESCE(NULLIF(NEW.unit_cost, 0), NULLIF(NEW.unit_price, 0), 0);
    ELSE
      v_rate := COALESCE(NULLIF(NEW.unit_price, 0), NULLIF(NEW.unit_cost, 0), 0);
    END IF;
    
    v_new_amount := NEW.qty * v_rate;
    
    -- Check if any relevant field changed
    IF OLD.qty IS DISTINCT FROM NEW.qty 
       OR OLD.unit_price IS DISTINCT FROM NEW.unit_price
       OR OLD.unit_cost IS DISTINCT FROM NEW.unit_cost
       OR OLD.movement_date IS DISTINCT FROM NEW.movement_date
       OR OLD.remark IS DISTINCT FROM NEW.remark THEN
      
      -- Update the linked transaction
      UPDATE transactions
      SET 
        amount = v_new_amount,
        date = NEW.movement_date,
        note = NEW.remark
      WHERE reference_type = 'stock_movement'
        AND reference_id = NEW.id::text;
        
      -- Also update party_transactions
      UPDATE party_transactions
      SET
        qty = NEW.qty,
        rate = v_rate,
        amount = v_new_amount,
        date = NEW.movement_date,
        remarks = NEW.remark
      WHERE reference = NEW.id::text
        AND source IN ('STOCK_IN', 'WHOLESALE_OUT');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;