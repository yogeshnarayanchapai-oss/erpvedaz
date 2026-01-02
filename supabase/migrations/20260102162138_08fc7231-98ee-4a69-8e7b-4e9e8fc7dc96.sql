-- Update the trigger to handle WHOLESALE_OUT movements properly for party transactions
CREATE OR REPLACE FUNCTION public.create_party_transaction_from_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_count INTEGER;
BEGIN
  -- Only create party transaction if party_id is set
  IF NEW.party_id IS NOT NULL AND NEW.movement_source IS NOT NULL THEN
    
    -- For SUPPLIER purchases (IN movements)
    IF NEW.movement_type = 'IN' AND NEW.movement_source = 'SUPPLIER' THEN
      -- Check if a party transaction already exists for this stock movement
      SELECT COUNT(*) INTO v_existing_count
      FROM public.party_transactions
      WHERE party_id = NEW.party_id
        AND source = 'STOCK_IN'
        AND reference = NEW.id::text;
      
      -- Only create if no existing record
      IF v_existing_count = 0 THEN
        INSERT INTO public.party_transactions (
          party_id,
          date,
          product_id,
          warehouse_id,
          qty,
          rate,
          amount,
          direction,
          source,
          reference,
          remarks
        ) VALUES (
          NEW.party_id,
          NEW.movement_date,
          NEW.product_id,
          NEW.warehouse_id,
          NEW.qty,
          COALESCE(NEW.unit_cost, 0),
          NEW.qty * COALESCE(NEW.unit_cost, 0),
          'PAYABLE',
          'STOCK_IN',
          NEW.id::text,
          NEW.remark
        );
      END IF;
    END IF;
    
    -- For WHOLESALE sales (WHOLESALE_OUT movements) - creates RECEIVABLE
    IF NEW.movement_type = 'WHOLESALE_OUT' AND NEW.movement_source = 'WHOLESALE' THEN
      -- Check if a party transaction already exists for this stock movement
      SELECT COUNT(*) INTO v_existing_count
      FROM public.party_transactions
      WHERE party_id = NEW.party_id
        AND source = 'WHOLESALE_OUT'
        AND reference = NEW.id::text;
      
      -- Only create if no existing record
      IF v_existing_count = 0 THEN
        INSERT INTO public.party_transactions (
          party_id,
          date,
          product_id,
          warehouse_id,
          qty,
          rate,
          amount,
          direction,
          source,
          reference,
          remarks
        ) VALUES (
          NEW.party_id,
          NEW.movement_date,
          NEW.product_id,
          NEW.warehouse_id,
          NEW.qty,
          COALESCE(NEW.unit_price, 0),
          NEW.qty * COALESCE(NEW.unit_price, 0),
          'RECEIVABLE',
          'WHOLESALE_OUT',
          NEW.id::text,
          NEW.remark
        );
      END IF;
    END IF;
    
    -- Legacy support: For regular OUT movements with WHOLESALE source
    IF NEW.movement_type = 'OUT' AND NEW.movement_source = 'WHOLESALE' THEN
      SELECT COUNT(*) INTO v_existing_count
      FROM public.party_transactions
      WHERE party_id = NEW.party_id
        AND source = 'WHOLESALE_OUT'
        AND reference = NEW.id::text;
      
      IF v_existing_count = 0 THEN
        INSERT INTO public.party_transactions (
          party_id,
          date,
          product_id,
          warehouse_id,
          qty,
          rate,
          amount,
          direction,
          source,
          reference,
          remarks
        ) VALUES (
          NEW.party_id,
          NEW.movement_date,
          NEW.product_id,
          NEW.warehouse_id,
          NEW.qty,
          COALESCE(NEW.unit_price, 0),
          NEW.qty * COALESCE(NEW.unit_price, 0),
          'RECEIVABLE',
          'WHOLESALE_OUT',
          NEW.id::text,
          NEW.remark
        );
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;