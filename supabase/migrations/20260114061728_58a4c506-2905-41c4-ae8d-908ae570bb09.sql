-- Fix party_transactions_source_check violations by using allowed source codes
-- Allowed sources: STOCK_IN, WHOLESALE_OUT, ADJUSTMENT

CREATE OR REPLACE FUNCTION public.create_party_transaction_from_stock_movement()
RETURNS TRIGGER AS $$
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
    v_rate := COALESCE(NEW.unit_cost, NEW.unit_price, 0);
  ELSE
    -- Wholesale Out = Receivable (party owes us)
    v_direction := 'RECEIVABLE';
    v_source := 'WHOLESALE_OUT';
    v_rate := COALESCE(NEW.unit_price, NEW.unit_cost, 0);
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;